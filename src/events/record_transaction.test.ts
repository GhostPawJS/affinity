import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { recordTransaction } from "./record_transaction.ts";

describe("recordTransaction", () => {
  it("inserts transaction event", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: other } = createContact(db, { name: "A", kind: "human" });
    const r = recordTransaction(db, {
      occurredAt: 1,
      summary: "invoice paid",
      significance: 4,
      participants: [
        { contactId: owner.id, role: "actor" },
        { contactId: other.id, role: "recipient" },
      ],
    });
    strictEqual(r.primary.type, "transaction");
    db.close();
  });
});
