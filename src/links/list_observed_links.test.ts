import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { recordObservation } from "../events/record_observation.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { listObservedLinks } from "./list_observed_links.ts";

describe("listObservedLinks", () => {
  it("orders by last meaningful event time descending", async () => {
    const db = await createInitializedAffinityDb();
    createContact(db, { name: "Me", kind: "human", bootstrapOwner: true });
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    const { primary: c } = createContact(db, { name: "C", kind: "human" });
    recordObservation(db, {
      occurredAt: 10,
      summary: "saw them together",
      significance: 3,
      participants: [
        { contactId: a.id, role: "observer" },
        { contactId: b.id, role: "subject" },
      ],
    });
    recordObservation(db, {
      occurredAt: 20,
      summary: "saw them again",
      significance: 3,
      participants: [
        { contactId: a.id, role: "observer" },
        { contactId: c.id, role: "subject" },
      ],
    });
    const rows = listObservedLinks(db);
    strictEqual(rows.length, 2);
    strictEqual(rows[0]?.toContactId, c.id);
    strictEqual(rows[1]?.toContactId, b.id);
    db.close();
  });
});
