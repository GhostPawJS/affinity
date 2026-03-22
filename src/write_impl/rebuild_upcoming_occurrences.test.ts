import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitializedAffinityDb } from "../lib/test-db.ts";
import { addDateAnchor } from "./add_date_anchor.ts";
import { createContact } from "./create_contact.ts";
import { rebuildUpcomingOccurrences } from "./rebuild_upcoming_occurrences.ts";
import { removeDateAnchor } from "./remove_date_anchor.ts";

describe("rebuildUpcomingOccurrences", () => {
  it("repopulates after materialization rows are cleared", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    addDateAnchor(db, {
      target: { kind: "contact", contactId: c.id },
      recurrenceKind: "birthday",
      anchorMonth: 8,
      anchorDay: 20,
      summary: "B-day",
      significance: 4,
    });
    db.prepare("DELETE FROM upcoming_occurrences").run();
    const before = db
      .prepare("SELECT COUNT(*) AS c FROM upcoming_occurrences")
      .get() as { c?: number };
    strictEqual(Number(before?.c ?? 0), 0);
    const n = rebuildUpcomingOccurrences(db);
    strictEqual(n, 1);
    const after = db
      .prepare("SELECT COUNT(*) AS c FROM upcoming_occurrences")
      .get() as { c?: number };
    strictEqual(Number(after?.c ?? 0), 1);
    db.close();
  });

  it("skips soft-deleted anchors", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    const r = addDateAnchor(db, {
      target: { kind: "contact", contactId: c.id },
      recurrenceKind: "memorial",
      anchorMonth: 1,
      anchorDay: 2,
      summary: "Mem",
      significance: 5,
    });
    removeDateAnchor(db, r.primary.id);
    const n = rebuildUpcomingOccurrences(db);
    strictEqual(n, 0);
    const row = db
      .prepare("SELECT COUNT(*) AS c FROM upcoming_occurrences")
      .get() as { c?: number };
    strictEqual(Number(row?.c ?? 0), 0);
    db.close();
  });
});
