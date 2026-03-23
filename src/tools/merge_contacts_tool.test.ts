import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { addIdentity } from "../identities/add_identity.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { mergeContactsToolHandler } from "./merge_contacts_tool.ts";

describe("merge_contacts_tool", () => {
  it("merges contacts through contact locators", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: winner } = createContact(db, { name: "Ada", kind: "human" });
    const { primary: loser } = createContact(db, { name: "A. Lovelace", kind: "human" });
    addIdentity(db, winner.id, { type: "email", value: "ada@example.com" });
    addIdentity(db, loser.id, { type: "email", value: "lovelace@example.com" });

    const result = mergeContactsToolHandler(db, {
      winner: { identity: { type: "email", value: "ada@example.com" } },
      loser: { identity: { type: "email", value: "lovelace@example.com" } },
      reasonSummary: "same person",
    });

    strictEqual(result.ok, true);
    if (result.ok) {
      strictEqual(result.data.primary.winnerContactId, winner.id);
      strictEqual(result.data.primary.loserContactId, loser.id);
    }
    db.close();
  });
});
