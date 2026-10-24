import { strictEqual, throws } from "node:assert/strict";
import { it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { addDateAnchor } from "./add_date_anchor.ts";
import { listUpcomingDates } from "./list_upcoming_dates.ts";

it("validates date filters and intersects horizon with explicit date bounds", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const now = Date.UTC(2026, 0, 1);
    const c = createContact(db, { name: "A", kind: "human" }).primary;
    addDateAnchor(db, {
      target: { kind: "contact", contactId: c.id },
      recurrenceKind: "birthday",
      anchorMonth: 1,
      anchorDay: 2,
      summary: "birthday",
      significance: 5,
      now,
    });
    for (const horizonDays of [-1, 1.5, Number.NaN])
      throws(() => listUpcomingDates(db, { horizonDays }));
    throws(() => listUpcomingDates(db, { contactKind: "invalid" as "human" }));
    throws(() =>
      listUpcomingDates(db, { recurrenceKind: "invalid" as "birthday" }),
    );
    strictEqual(
      listUpcomingDates(
        db,
        { contactKind: "human", recurrenceKind: "birthday", horizonDays: 2 },
        { since: now },
      ).length,
      1,
    );
    strictEqual(
      listUpcomingDates(db, { contactKind: "company" }, { since: now }).length,
      0,
    );
    strictEqual(
      listUpcomingDates(db, { horizonDays: 2 }, { since: now, until: now })
        .length,
      0,
    );
    strictEqual(
      listUpcomingDates(db, { horizonDays: 0 }, { since: now }).length,
      0,
    );
    strictEqual(
      listUpcomingDates(
        db,
        { horizonDays: 2 },
        { since: now, until: now + 10 * 86400000 },
      ).length,
      1,
    );
  } finally {
    db.close();
  }
});
