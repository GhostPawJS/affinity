import { deepStrictEqual, strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { addDateAnchor } from "./add_date_anchor.ts";
import { reviseDateAnchor } from "./revise_date_anchor.ts";

describe("reviseDateAnchor", () => {
  it("updates summary", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    const { primary: ev } = addDateAnchor(db, {
      target: { kind: "contact", contactId: c.id },
      recurrenceKind: "birthday",
      anchorMonth: 3,
      anchorDay: 15,
      summary: "birthday",
      significance: 5,
    });
    const r = reviseDateAnchor(db, ev.id, { summary: "big day" });
    strictEqual(r.primary.summary, "big day");
    db.close();
  });
});

it("validates revisions atomically and supports partial and forced updates", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    const input = {
      target: { kind: "contact" as const, contactId: c.id },
      recurrenceKind: "birthday" as const,
      anchorMonth: 3,
      anchorDay: 15,
      summary: "birthday",
      significance: 5,
    };
    const { primary: a } = addDateAnchor(db, input);
    deepStrictEqual(reviseDateAnchor(db, a.id, {}).updated, []);
    for (const patch of [
      { summary: " " },
      { significance: 0 },
      { significance: 11 },
      { significance: 1.5 },
      { anchorMonth: 13 },
      { anchorDay: 32 },
    ]) {
      throws(() => reviseDateAnchor(db, a.id, patch));
      strictEqual(reviseDateAnchor(db, a.id, {}).primary.summary, "birthday");
    }
    const { primary: b } = addDateAnchor(db, { ...input, anchorDay: 16 });
    throws(() => reviseDateAnchor(db, a.id, { anchorDay: 16 }), /duplicate/);
    strictEqual(
      reviseDateAnchor(db, a.id, { anchorDay: 16 }, { force: true }).primary
        .anchorDay,
      b.anchorDay,
    );
    strictEqual(
      reviseDateAnchor(db, a.id, {
        recurrenceKind: "anniversary",
        anchorMonth: 4,
        anchorDay: 20,
        significance: 10,
        summary: " revised ",
      }).primary.summary,
      "revised",
    );
  } finally {
    db.close();
  }
});
