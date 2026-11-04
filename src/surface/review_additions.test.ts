import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Readable, Writable } from "node:stream";
import { test } from "node:test";
import { listOpenCommitments } from "../events/list_open_commitments.ts";
import { initAffinityTables } from "../init_affinity_tables.ts";
import {
  localCalendarDate,
  parseCalendarTime,
} from "../lib/parse_calendar_time.ts";
import { withTimeZone } from "../lib/time_zone.ts";
import { runToolCli } from "../surfaces/cli.ts";
import { manageCommitmentToolHandler } from "../tools/manage_commitment_tool.ts";
import { reviewAffinityToolHandler } from "../tools/review_affinity_tool.ts";
import * as write from "../write.ts";
import { affinityCliOptions } from "./affinity_cli_options.ts";

function fixture() {
  const db = new DatabaseSync(":memory:");
  initAffinityTables(db);
  write.createContact(db, {
    name: "Owner",
    kind: "human",
    bootstrapOwner: true,
  });
  write.createContact(db, { name: "Other", kind: "human" });
  return db;
}
async function cli(
  args: string[],
  input = "",
  terminal = false,
  db?: DatabaseSync,
) {
  let out = "";
  let err = "";
  const stdout = Object.assign(
    new Writable({
      write(chunk, _enc, cb) {
        out += String(chunk);
        cb();
      },
    }),
    { isTTY: terminal },
  );
  const stderr = new Writable({
    write(chunk, _enc, cb) {
      err += String(chunk);
      cb();
    },
  });
  const code = await runToolCli(args, {
    ...affinityCliOptions,
    stdin: Readable.from([input]),
    stdout,
    stderr,
    ...(db
      ? {
          openContext: () => db,
          closeContext: () => {},
          contextError: () => undefined,
          preflight: async () => db,
        }
      : {}),
  });
  return { out, err, code };
}
function event(db: DatabaseSync, time: number, summary: string, contactId = 2) {
  return write.recordObservation(db, {
    occurredAt: time,
    summary,
    significance: 1,
    participants: [{ contactId, role: "actor" }],
  }).primary;
}

test("structural chart edges are opt-in, marked, unique and respect the contact subset", async () => {
  const db = fixture();
  try {
    const tie = write.setStructuralTie(db, {
      fromContactId: 1,
      toContactId: 2,
      kind: "friend_of",
    }).primary;
    write.setStructuralTie(db, {
      fromContactId: 1,
      toContactId: 2,
      kind: "friend_of",
    });
    const defaults = reviewAffinityToolHandler(db, { view: "graph.chart" });
    assert.ok(defaults.ok);
    assert.deepEqual(defaults.data.chart?.edges, []);
    const result = reviewAffinityToolHandler(db, {
      view: "graph.chart",
      includeStructural: true,
    });
    assert.ok(result.ok);
    assert.deepEqual(
      result.data.chart?.edges.map((e) => [e.kind, e.tieId, e.tieType]),
      [["structural", tie.id, "friend_of"]],
    );
    const subset = reviewAffinityToolHandler(db, {
      view: "graph.chart",
      includeStructural: true,
      contactIds: [1],
    });
    assert.ok(subset.ok);
    assert.deepEqual(subset.data.chart?.edges, []);
    const output = await cli(
      ["review", "graph.chart", "--include-structural", "--json"],
      "",
      true,
      db,
    );
    assert.equal(output.code, 0, output.err);
    assert.equal(JSON.parse(output.out).data.chart.edges[0].tieId, tie.id);
  } finally {
    db.close();
  }
});

test("portfolio timeline orders and pages events, filters inclusive date/string/epoch bounds, excludes deletions", async () => {
  const db = fixture();
  try {
    const start = Date.parse("2026-11-04T00:00:00Z");
    event(db, start - 1, "Before");
    const first = event(db, start, "First", 1);
    const second = event(db, start + 1000, "Second");
    const third = event(db, start + 1000, "Third", 1);
    const deleted = event(db, start + 2000, "Deleted");
    write.deleteEvent(db, { eventId: deleted.id }, { confirm: true });
    const result = reviewAffinityToolHandler(db, {
      view: "events.timeline",
      since: "2026-11-04",
      until: String(start + 1000),
      limit: 2,
    });
    assert.ok(result.ok);
    assert.deepEqual(
      result.data.items.map((e) => e.id),
      [third.id, second.id],
    );
    assert.equal(result.data.total, 3);
    assert.equal(result.data.hasMore, true);
    const page = reviewAffinityToolHandler(db, {
      view: "events.timeline",
      since: start,
      until: "2026-11-04T00:00:01Z",
      limit: 2,
      offset: 2,
    });
    assert.ok(page.ok);
    assert.deepEqual(
      page.data.items.map((e) => e.id),
      [first.id],
    );
    const output = await cli(
      [
        "review",
        "events.timeline",
        "--since",
        "2026-11-04",
        "--until",
        String(start + 1000),
        "--limit",
        "2",
      ],
      "",
      true,
      db,
    );
    assert.equal(output.code, 0, output.err);
    assert.match(output.out, /Third/);
    assert.doesNotMatch(output.out, /Before|First|Deleted/);
    const json = await cli(
      ["review", "events.timeline", "--json"],
      "",
      true,
      db,
    );
    assert.equal(JSON.parse(json.out).data.view, "events.timeline");
    const invalid = reviewAffinityToolHandler(db, {
      view: "events.timeline",
      since: "not-a-date",
    });
    assert.equal(invalid.ok, false);
  } finally {
    db.close();
  }
});

test("due days and local days honor TZ and explicit tool/CLI zones, retaining the unset default", async () => {
  const previous = process.env.TZ;
  Reflect.deleteProperty(process.env, "TZ");
  const db = fixture();
  try {
    const time = "2026-11-04T23:02:00Z";
    assert.equal(parseCalendarTime(time, "dueAt").day, "2026-11-04");
    process.env.TZ = "Europe/Berlin";
    assert.equal(parseCalendarTime(time, "dueAt").day, "2026-11-05");
    assert.equal(localCalendarDate(Date.parse(time)), "2026-11-05");
    assert.equal(
      parseCalendarTime(Date.parse(time), "dueAt").day,
      "2026-11-05",
    );
    Reflect.deleteProperty(process.env, "TZ");
    assert.equal(
      withTimeZone(
        "Europe/Berlin",
        () => parseCalendarTime("today", "dueAt", Date.parse(time)).day,
      ),
      "2026-11-05",
    );
    const input = {
      commitmentType: "promise" as const,
      occurredAt: 1,
      dueAt: time,
      summary: "Promise",
      significance: 1,
      participants: [{ contactId: 1, role: "actor" as const }],
    };
    const direct = manageCommitmentToolHandler(db, {
      action: "record",
      tz: "Europe/Berlin",
      input,
    });
    assert.ok(direct.ok);
    assert.equal(direct.data.primary.dueOn, "2026-11-05");
    const plain = await cli(
      ["commitment", "record", "--input", JSON.stringify(input), "--json"],
      "",
      true,
      db,
    );
    assert.equal(JSON.parse(plain.out).data.primary.dueOn, "2026-11-04");
    const zoned = await cli(
      [
        "--tz",
        "Europe/Berlin",
        "commitment",
        "record",
        "--input",
        JSON.stringify(input),
        "--json",
      ],
      "",
      true,
      db,
    );
    assert.equal(zoned.code, 0, zoned.err);
    assert.equal(JSON.parse(zoned.out).data.primary.dueOn, "2026-11-05");
    assert.equal(parseCalendarTime(time, "dueAt").day, "2026-11-04");
    for (const args of [["--tz", "Invalid/Zone"], ["--tz"], ["--tz="]]) {
      const invalid = await cli(
        [...args, "review", "commitments.open"],
        "",
        true,
        db,
      );
      assert.equal(invalid.code, 2);
      assert.match(invalid.err, /time zone/);
    }
    const invalid = manageCommitmentToolHandler(db, {
      action: "record",
      tz: "Invalid/Zone",
      input,
    });
    assert.equal(invalid.ok, false);
    assert.match(JSON.stringify(invalid), /Invalid time zone/);
    const day = withTimeZone("Europe/Berlin", () =>
      parseCalendarTime("2026-11-04", "dueAt"),
    );
    assert.equal(day.day, "2026-11-04");
    const calendarPromise = write.recordCommitment(db, {
      commitmentType: "promise",
      occurredAt: 1,
      dueAt: day.timestamp,
      dueOn: day.day,
      summary: "Calendar promise",
      significance: 1,
      participants: [{ contactId: 1, role: "actor" }],
    }).primary;
    const now = Date.parse(time);
    const utc = listOpenCommitments(db, undefined, { now, tz: "UTC" });
    const berlin = listOpenCommitments(db, undefined, {
      now,
      tz: "Europe/Berlin",
    });
    assert.equal(
      utc.find((c) => c.eventId === calendarPromise.id)?.overdue,
      false,
    );
    assert.equal(
      berlin.find((c) => c.eventId === calendarPromise.id)?.overdue,
      true,
    );
  } finally {
    if (previous === undefined) Reflect.deleteProperty(process.env, "TZ");
    else process.env.TZ = previous;
    db.close();
  }
});

test("batch counts contact and event revisions separately and keeps line receipts", async () => {
  const dir = mkdtempSync(join(tmpdir(), "affinity-revised-"));
  try {
    const lines: object[] = [
      {
        tool: "manage_contact",
        args: {
          action: "create",
          input: { name: "Owner", kind: "human", bootstrapOwner: true },
        },
      },
      {
        tool: "manage_contact",
        args: {
          action: "revise",
          contact: { contactId: 1 },
          patch: { name: "Renamed" },
        },
      },
      {
        op: "event",
        kind: "observation",
        input: {
          occurredAt: 1,
          summary: "Original",
          significance: 1,
          participants: [{ contactId: 1, role: "actor" }],
        },
      },
      {
        tool: "manage_event",
        args: { action: "revise", eventId: 1, patch: { summary: "Corrected" } },
      },
    ];
    lines.push({
      tool: "manage_contact",
      args: {
        action: "set_lifecycle",
        contact: { contactId: 1 },
        lifecycleState: "dormant",
      },
    });
    const output = await cli(
      ["--db", join(dir, "test.db"), "batch"],
      lines.map((l) => JSON.stringify(l)).join("\n"),
    );
    assert.equal(output.code, 0, output.err);
    const rows = output.out
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    assert.deepEqual(rows.at(-1), {
      done: 5,
      created: 2,
      revised: 3,
      noOp: 0,
      failed: 0,
    });
    assert.deepEqual(rows[1], { line: 2, ok: true, outcome: "success", id: 1 });
    assert.deepEqual(rows[3], { line: 4, ok: true, outcome: "success", id: 1 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("GHOSTPAW_OUTPUT=json matches --json on terminals; other values preserve text", async () => {
  const previous = process.env.GHOSTPAW_OUTPUT;
  const db = fixture();
  try {
    const explicit = await cli(
      ["review", "contacts.list", "--json"],
      "",
      true,
      db,
    );
    process.env.GHOSTPAW_OUTPUT = "json";
    const env = await cli(["review", "contacts.list"], "", true, db);
    assert.equal(env.out, explicit.out);
    for (const value of [undefined, "text", "JSON", ""]) {
      if (value === undefined)
        Reflect.deleteProperty(process.env, "GHOSTPAW_OUTPUT");
      else process.env.GHOSTPAW_OUTPUT = value;
      const output = await cli(["review", "contacts.list"], "", true, db);
      assert.equal(output.code, 0, output.err);
      assert.match(output.out, /Other/);
      assert.doesNotMatch(output.out, /"ok"/);
    }
  } finally {
    if (previous === undefined)
      Reflect.deleteProperty(process.env, "GHOSTPAW_OUTPUT");
    else process.env.GHOSTPAW_OUTPUT = previous;
    db.close();
  }
});
