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

  it("filters by kind without breaking results", async () => {
    const db = await createInitializedAffinityDb();
    createContact(db, { name: "Elena Petrova", kind: "human" });
    createContact(db, { name: "Elena Corp", kind: "company" });
    const all = searchContacts(db, "Elena");
    strictEqual(all.length, 2);
    const humans = searchContacts(db, "Elena", { kind: "human" });
    strictEqual(humans.length, 1);
    strictEqual(humans[0]?.name, "Elena Petrova");
    const pets = searchContacts(db, "Elena", { kind: "pet" });
    strictEqual(pets.length, 0);
    db.close();
  });

  it("respects options.includeDormant = false", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: active } = createContact(db, {
      name: "Bob Active",
      kind: "human",
    });
    const { primary: dormant } = createContact(db, {
      name: "Bob Dormant",
      kind: "human",
    });
    db.prepare(
      "UPDATE contacts SET lifecycle_state = 'dormant' WHERE id = ?",
    ).run(dormant.id);
    const all = searchContacts(db, "Bob");
    strictEqual(all.length, 2);
    const filtered = searchContacts(db, "Bob", undefined, {
      includeDormant: false,
    });
    strictEqual(filtered.length, 1);
    strictEqual(filtered[0]?.id, active.id);
    db.close();
  });
});
