import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { manageIdentityToolHandler } from "./manage_identity_tool.ts";

describe("manage_identity_tool", () => {
  it("adds, verifies, and removes an identity", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: contact } = createContact(db, {
      name: "Ada",
      kind: "human",
    });

    const added = manageIdentityToolHandler(db, {
      action: "add",
      contact: { contactId: contact.id },
      input: { type: "email", value: "ada@example.com" },
    });
    strictEqual(added.ok, true);
    if (!added.ok) throw new Error("expected success");

    const verified = manageIdentityToolHandler(db, {
      action: "verify",
      identityId: added.data.primary.id,
      verifiedAt: 42,
    });
    strictEqual(verified.ok, true);

    const removed = manageIdentityToolHandler(db, {
      action: "remove",
      identityId: added.data.primary.id,
      removedAt: 99,
    });
    strictEqual(removed.ok, true);
    db.close();
  });
});
