import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { recordInteraction } from "../events/record_interaction.ts";
import { recordTransaction } from "../events/record_transaction.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { listProgressionReadiness } from "./list_progression_readiness.ts";

describe("listProgressionReadiness", () => {
  it("orders rows by readiness score descending", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    recordInteraction(db, {
      type: "conversation",
      occurredAt: 10,
      summary: "strong",
      significance: 9,
      participants: [
        { contactId: owner.id, role: "actor", directionality: "mutual" },
        { contactId: a.id, role: "recipient", directionality: "mutual" },
      ],
    });
    recordTransaction(db, {
      occurredAt: 11,
      summary: "weak",
      significance: 2,
      participants: [
        {
          contactId: owner.id,
          role: "actor",
          directionality: "owner_initiated",
        },
        {
          contactId: b.id,
          role: "recipient",
          directionality: "other_initiated",
        },
      ],
    });
    const rows = listProgressionReadiness(db);
    strictEqual(rows.length, 2);
    strictEqual(rows[0]?.toContactId, a.id);
    strictEqual(rows[1]?.toContactId, b.id);
    db.close();
  });
});
