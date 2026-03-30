import { strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { listDuplicateCandidates } from "../contacts/list_duplicate_candidates.ts";
import { AffinityConflictError } from "../lib/errors/affinity_conflict_error.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { dismissDuplicate } from "../merges/dismiss_duplicate.ts";
import { addIdentity } from "./add_identity.ts";

describe("addIdentity", () => {
  it("inserts an identity", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    const r = addIdentity(db, c.id, {
      type: "email",
      value: "a@b",
    });
    strictEqual(r.primary.type, "email");
    strictEqual(r.primary.value, "a@b");
    strictEqual(r.created[0]?.kind, "identity");
    db.close();
  });

  it("rejects duplicate normalized key", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    addIdentity(db, c.id, { type: "email", value: "a@b" });
    const { primary: c2 } = createContact(db, { name: "B", kind: "human" });
    throws(
      () => addIdentity(db, c2.id, { type: "email", value: "A@B" }),
      (e: unknown) => e instanceof AffinityConflictError,
    );
    db.close();
  });

  it("rejects missing contact", async () => {
    const db = await createInitializedAffinityDb();
    throws(
      () => addIdentity(db, 999, { type: "email", value: "a@b" }),
      (e: unknown) => e instanceof AffinityNotFoundError,
    );
    db.close();
  });

  it("clears dismissed pair when identity is added to one contact", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "Sarah", kind: "human" });
    const { primary: b } = createContact(db, { name: "Sarah", kind: "human" });

    dismissDuplicate(db, a.id, b.id, "seemed different");

    // Pair is hidden
    strictEqual(
      listDuplicateCandidates(db).some(
        (c) =>
          (c.leftContactId === a.id || c.rightContactId === a.id) &&
          (c.leftContactId === b.id || c.rightContactId === b.id),
      ),
      false,
    );

    // Add identity to one — should invalidate dismissal
    addIdentity(db, a.id, { type: "email", value: "sarah.new@example.com" });

    // Pair is visible again
    strictEqual(
      listDuplicateCandidates(db).some(
        (c) =>
          (c.leftContactId === a.id || c.rightContactId === a.id) &&
          (c.leftContactId === b.id || c.rightContactId === b.id),
      ),
      true,
    );

    db.close();
  });

  it("rejects merged contact", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "M", kind: "human" });
    db.prepare(
      "UPDATE contacts SET lifecycle_state = 'merged' WHERE id = ?",
    ).run(c.id);
    throws(
      () => addIdentity(db, c.id, { type: "email", value: "a@b" }),
      (e: unknown) => e instanceof AffinityStateError,
    );
    db.close();
  });
});
