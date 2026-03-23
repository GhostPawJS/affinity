import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { addIdentity } from "../identities/add_identity.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { searchAffinityToolHandler } from "./search_affinity_tool.ts";

describe("search_affinity_tool", () => {
  it("finds contacts by natural-key identity", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: contact } = createContact(db, { name: "Ada", kind: "human" });
    addIdentity(db, contact.id, {
      type: "email",
      value: "ada@example.com",
    });

    const result = searchAffinityToolHandler(db, {
      query: "email:ada@example.com",
    });

    strictEqual(result.ok, true);
    if (result.ok) {
      strictEqual(result.data.items.length, 1);
      strictEqual(result.data.items[0]?.title, "Ada");
    }
    db.close();
  });
});
