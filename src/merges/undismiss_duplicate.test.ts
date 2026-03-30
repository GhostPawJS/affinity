import { strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { listDuplicateCandidates } from "../contacts/list_duplicate_candidates.ts";
import { addIdentity } from "../identities/add_identity.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { dismissDuplicate } from "./dismiss_duplicate.ts";
import { undismissDuplicate } from "./undismiss_duplicate.ts";

describe("undismissDuplicate", () => {
  it("removes the dismissal so the pair reappears in listDuplicateCandidates", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "Sarah", kind: "human" });
    const { primary: b } = createContact(db, { name: "Sarah", kind: "human" });
    addIdentity(db, a.id, { type: "email", value: "sarah.a@example.com" });
    addIdentity(db, b.id, { type: "email", value: "sarah.b@example.com" });

    dismissDuplicate(db, a.id, b.id);
    strictEqual(
      listDuplicateCandidates(db).some(
        (c) =>
          (c.leftContactId === a.id || c.rightContactId === a.id) &&
          (c.leftContactId === b.id || c.rightContactId === b.id),
      ),
      false,
    );

    undismissDuplicate(db, a.id, b.id);
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

  it("is idempotent — undismissing a non-dismissed pair does not throw", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "Sarah", kind: "human" });
    const { primary: b } = createContact(db, { name: "Sarah", kind: "human" });

    // No dismiss was done first
    const receipt = undismissDuplicate(db, a.id, b.id);
    strictEqual(receipt.primary.leftContactId, Math.min(a.id, b.id));

    db.close();
  });

  it("throws AffinityValidationError when both IDs are the same", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "Sarah", kind: "human" });

    throws(
      () => undismissDuplicate(db, a.id, a.id),
      (err: unknown) => err instanceof AffinityValidationError,
    );

    db.close();
  });

  it("throws AffinityNotFoundError for unknown contact", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "Sarah", kind: "human" });

    throws(
      () => undismissDuplicate(db, a.id, 99999),
      (err: unknown) => err instanceof AffinityNotFoundError,
    );

    db.close();
  });
});
