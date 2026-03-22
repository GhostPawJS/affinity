import { strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { AffinityConflictError } from "../lib/errors/affinity_conflict_error.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { addDateAnchor } from "./add_date_anchor.ts";

describe("addDateAnchor", () => {
  it("inserts a contact-scoped anchor", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    const r = addDateAnchor(db, {
      target: { kind: "contact", contactId: c.id },
      recurrenceKind: "birthday",
      anchorMonth: 3,
      anchorDay: 15,
      summary: "birthday",
      significance: 5,
    });
    strictEqual(r.primary.type, "date_anchor");
    strictEqual(r.primary.recurrenceKind, "birthday");
    strictEqual(r.primary.anchorContactId, c.id);
    db.close();
  });

  it("rejects duplicate anchor without force", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    addDateAnchor(db, {
      target: { kind: "contact", contactId: c.id },
      recurrenceKind: "birthday",
      anchorMonth: 3,
      anchorDay: 15,
      summary: "one",
      significance: 5,
    });
    throws(
      () =>
        addDateAnchor(db, {
          target: { kind: "contact", contactId: c.id },
          recurrenceKind: "birthday",
          anchorMonth: 3,
          anchorDay: 15,
          summary: "two",
          significance: 6,
        }),
      (e: unknown) => e instanceof AffinityConflictError,
    );
    db.close();
  });
});
