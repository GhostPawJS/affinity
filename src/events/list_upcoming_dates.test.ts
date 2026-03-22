import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { addDateAnchor } from "./add_date_anchor.ts";
import { listUpcomingDates } from "./list_upcoming_dates.ts";

describe("listUpcomingDates", () => {
  it("returns materialized upcoming rows for anchors", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    addDateAnchor(db, {
      target: { kind: "contact", contactId: c.id },
      recurrenceKind: "birthday",
      anchorMonth: 6,
      anchorDay: 1,
      summary: "Summer day",
      significance: 7,
    });
    const rows = listUpcomingDates(db, {}, { limit: 10 });
    strictEqual(rows.length >= 1, true);
    const first = rows[0];
    if (first === undefined) {
      throw new Error("expected row");
    }
    strictEqual(first.summary, "Summer day");
    strictEqual(first.recurrenceKind, "birthday");
    strictEqual(first.targetRef.kind, "contact");
    strictEqual(first.targetRef.id, c.id);
    strictEqual(typeof first.occursOn, "number");
    db.close();
  });

  it("filters by recurrence kind", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    addDateAnchor(db, {
      target: { kind: "contact", contactId: c.id },
      recurrenceKind: "memorial",
      anchorMonth: 11,
      anchorDay: 2,
      summary: "Mem",
      significance: 5,
    });
    const memorial = listUpcomingDates(
      db,
      { recurrenceKind: "memorial" },
      { limit: 20 },
    );
    strictEqual(memorial.length, 1);
    const birthday = listUpcomingDates(
      db,
      { recurrenceKind: "birthday" },
      { limit: 20 },
    );
    strictEqual(birthday.length, 0);
    db.close();
  });
});
