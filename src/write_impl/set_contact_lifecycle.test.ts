import { strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import type { ContactLifecycleState } from "../contacts/types.ts";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import { createInitializedAffinityDb } from "../lib/test-db.ts";
import { createContact } from "./create_contact.ts";
import { setContactLifecycle } from "./set_contact_lifecycle.ts";

describe("setContactLifecycle", () => {
  it("transitions active to dormant and back", async () => {
    const db = await createInitializedAffinityDb();
    const { primary } = createContact(db, { name: "A", kind: "human" });
    const r1 = setContactLifecycle(db, primary.id, "dormant");
    strictEqual(r1.primary.lifecycleState, "dormant");
    const r2 = setContactLifecycle(db, primary.id, "active");
    strictEqual(r2.primary.lifecycleState, "active");
    db.close();
  });

  it("no-ops same state", async () => {
    const db = await createInitializedAffinityDb();
    const { primary } = createContact(db, { name: "A", kind: "human" });
    const r = setContactLifecycle(db, primary.id, "active");
    strictEqual(r.updated.length, 0);
    db.close();
  });

  it("throws when contact missing", async () => {
    const db = await createInitializedAffinityDb();
    throws(
      () => setContactLifecycle(db, 999, "dormant"),
      (e: unknown) => e instanceof AffinityNotFoundError,
    );
    db.close();
  });

  it("rejects merged terminal edits", async () => {
    const db = await createInitializedAffinityDb();
    const { primary } = createContact(db, { name: "M", kind: "human" });
    db.prepare(
      "UPDATE contacts SET lifecycle_state = 'merged' WHERE id = ?",
    ).run(primary.id);
    throws(
      () => setContactLifecycle(db, primary.id, "active"),
      (e: unknown) => e instanceof AffinityStateError,
    );
    db.close();
  });

  it("rejects direct transition to merged", async () => {
    const db = await createInitializedAffinityDb();
    const { primary } = createContact(db, { name: "A", kind: "human" });
    throws(
      () => setContactLifecycle(db, primary.id, "merged"),
      (e: unknown) => e instanceof AffinityInvariantError,
    );
    db.close();
  });

  it("rejects invalid target state string", async () => {
    const db = await createInitializedAffinityDb();
    const { primary } = createContact(db, { name: "A", kind: "human" });
    throws(
      () =>
        setContactLifecycle(db, primary.id, "typo" as ContactLifecycleState),
      (e: unknown) => e instanceof AffinityValidationError,
    );
    db.close();
  });
});
