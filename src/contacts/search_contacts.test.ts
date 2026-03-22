import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { addIdentity } from "../identities/add_identity.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { createContact } from "./create_contact.ts";
import { searchContacts } from "./search_contacts.ts";

describe("searchContacts", () => {
  it("prefers normalized identity hits over weaker name matches", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: exact } = createContact(db, {
      name: "Alice",
      kind: "human",
    });
    const { primary: fuzzy } = createContact(db, {
      name: "Alice Beta",
      kind: "human",
    });
    addIdentity(db, exact.id, { type: "email", value: "alice@example.com" });
    const rows = searchContacts(db, "email:alice@example.com");
    strictEqual(rows.length >= 1, true);
    strictEqual(rows[0]?.id, exact.id);
    strictEqual(
      rows.some((row) => row.id === fuzzy.id),
      false,
    );
    db.close();
  });
});
