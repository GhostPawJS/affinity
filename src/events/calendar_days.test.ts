import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  closeSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { addDateAnchor } from "../dates/add_date_anchor.ts";
import { listUpcomingDates } from "../dates/list_upcoming_dates.ts";
import { initAffinityTables } from "../init_affinity_tables.ts";
import {
  localCalendarDate,
  parseCalendarTime,
} from "../lib/parse_calendar_time.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { parsePlainStart } from "../surface/plain_dates.ts";
import { manageCommitmentToolHandler } from "../tools/manage_commitment_tool.ts";
import { parseTimeInput } from "../tools/parse_time_input.ts";
import { recordEventToolHandler } from "../tools/record_event_tool.ts";
import { reviewAffinityToolHandler } from "../tools/review_affinity_tool.ts";
import { getContactJournal } from "./get_contact_journal.ts";
import { listOpenCommitments } from "./list_open_commitments.ts";

if (!process.env.AFFINITY_CALENDAR_CHILD) {
  for (const TZ of ["Europe/Berlin", "UTC", "America/Los_Angeles"]) {
    test(`calendar storage and parsing in ${TZ}`, () => {
      const dir = mkdtempSync(join(tmpdir(), "affinity-calendar-"));
      const output = join(dir, "output");
      const fd = openSync(output, "w");
      try {
        const result = spawnSync(
          process.execPath,
          [
            "--experimental-strip-types",
            "--test",
            "--test-reporter=spec",
            import.meta.filename,
          ],
          {
            env: { ...process.env, TZ, AFFINITY_CALENDAR_CHILD: "1" },
            stdio: ["ignore", fd, fd],
          },
        );
        assert.ifError(result.error);
        assert.equal(result.status, 0, readFileSync(output, "utf8"));
      } finally {
        closeSync(fd);
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }
} else {
  test("shared grammar preserves calendar days through writes, journals and upcoming dates", async () => {
    const now = Date.parse("2026-10-28T12:00:00Z");
    for (const input of ["2026-09-12", "12.09.2026"]) {
      assert.deepEqual(parseCalendarTime(input), {
        timestamp: Date.parse("2026-09-12T00:00:00Z"),
        day: "2026-09-12",
      });
      assert.equal(parsePlainStart(input), parseTimeInput(input));
    }
    assert.deepEqual(parseCalendarTime("2026-09-12T00:30+02:00"), {
      timestamp: Date.parse("2026-09-11T22:30Z"),
      day: "2026-09-12",
    });
    assert.equal(parseCalendarTime(now).day, "2026-10-28");
    const edge = Date.parse("2026-10-28T00:30Z");
    assert.equal(
      parseCalendarTime("today", "time", edge).day,
      localCalendarDate(edge),
    );
    assert.equal(parseCalendarTime("tomorrow", "time", now).day, "2026-10-29");
    assert.equal(parseCalendarTime("yesterday", "time", now).day, "2026-10-27");
    assert.equal(parseCalendarTime("+3d", "time", now).day, "2026-10-31");
    assert.equal(parseCalendarTime("-2d", "time", now).day, "2026-10-26");
    for (const bad of ["31.02.2026", "2026-09-12T00:30", "next week"])
      assert.throws(() => parseCalendarTime(bad));
    const db = await createInitializedAffinityDb();
    try {
      createContact(db, { name: "Owner", kind: "human", bootstrapOwner: true });
      const contact = createContact(db, {
        name: "Jana",
        kind: "human",
      }).primary;
      const participants = [
        { contactId: contact.id, role: "recipient" as const },
      ];
      const recorded = recordEventToolHandler(db, {
        kind: "interaction",
        input: {
          type: "conversation",
          occurredAt: "2026-09-12",
          summary: "Call",
          significance: 5,
          participants,
          now,
        },
      });
      assert.ok(recorded.ok);
      assert.equal(recorded.data.primary.occurredOn, "2026-09-12");
      assert.equal(
        recorded.data.primary.occurredAt,
        Date.parse("2026-09-12T00:00Z"),
      );
      const offset = recordEventToolHandler(db, {
        kind: "interaction",
        input: {
          type: "conversation",
          occurredAt: "2026-09-12T00:30+02:00",
          summary: "Offset call",
          significance: 5,
          participants,
          now,
        },
      });
      assert.ok(offset.ok);
      assert.equal(offset.data.primary.occurredOn, "2026-09-12");
      assert.equal(
        getContactJournal(db, contact.id).find(
          (e) => e.id === offset.data.primary.id,
        )?.occurredOn,
        "2026-09-12",
      );
      const commitment = manageCommitmentToolHandler(db, {
        action: "record",
        input: {
          commitmentType: "promise",
          occurredAt: "2026-09-12",
          dueAt: "2026-10-15",
          summary: "Proposal",
          significance: 5,
          participants,
          now,
        },
      });
      assert.ok(commitment.ok);
      assert.equal(commitment.data.primary.dueOn, "2026-10-15");
      assert.equal(
        commitment.data.primary.dueAt,
        Date.parse("2026-10-15T23:59:59.999Z"),
      );
      assert.equal(
        db
          .prepare("SELECT occurred_on FROM events WHERE id = ?")
          .get(recorded.data.primary.id)?.occurred_on,
        "2026-09-12",
      );
      assert.equal(
        db.prepare("SELECT due_on FROM open_commitments").get()?.due_on,
        "2026-10-15",
      );
      assert.equal(
        listOpenCommitments(db, undefined, { now })[0]?.overdue,
        true,
      );
      assert.equal(
        listOpenCommitments(db, undefined, {
          now: new Date(2026, 9, 15, 23, 59).getTime(),
        })[0]?.overdue,
        false,
      );
      addDateAnchor(db, {
        target: { kind: "contact", contactId: contact.id },
        recurrenceKind: "birthday",
        anchorMonth: 11,
        anchorDay: 3,
        summary: "Birthday",
        significance: 5,
        now,
      });
      assert.equal(
        listUpcomingDates(db, { horizonDays: 14 }, { now })[0]?.occursOnDate,
        "2026-11-03",
      );
      const review = reviewAffinityToolHandler(db, {
        view: "dates.upcoming",
        horizonDays: 14,
        now,
      });
      assert.ok(review.ok);
      assert.equal(review.data.items[0]?.occursOn, "2026-11-03");
      assert.equal(
        review.data.items[0]?.occursAtIso,
        "2026-11-03T00:00:00.000Z",
      );
      const localDay = localCalendarDate(edge);
      const [, month, day] = localDay.split("-").map(Number);
      assert.ok(month && day);
      addDateAnchor(db, {
        target: { kind: "contact", contactId: contact.id },
        recurrenceKind: "custom_yearly",
        anchorMonth: month,
        anchorDay: day,
        summary: "Today",
        significance: 5,
        now: edge,
      });
      assert.equal(
        listUpcomingDates(db, { horizonDays: 0 }, { now: edge })[0]
          ?.occursOnDate,
        localDay,
      );
      // Simulate the columns absent in a 0.5.0 file, then upgrade without backfilling old rows.
      db.exec("ALTER TABLE events DROP COLUMN occurred_on");
      db.exec("ALTER TABLE open_commitments DROP COLUMN due_on");
      initAffinityTables(db);
      initAffinityTables(db);
      assert.equal(
        db.prepare("SELECT occurred_on FROM events LIMIT 1").get()?.occurred_on,
        null,
      );
      assert.equal(
        getContactJournal(db, contact.id).find(
          (e) => e.id === recorded.data.primary.id,
        )?.occurredOn,
        "2026-09-12",
      );
      assert.equal(listOpenCommitments(db)[0]?.dueOn, "2026-10-15");
    } finally {
      db.close();
    }
  });
}
