import { deepStrictEqual, strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { dismissDuplicate } from "./dismiss_duplicate.ts";
import { mergeContacts } from "./merge_contacts.ts";

describe("dismissDuplicate", () => {
  it("inserts a canonical row and returns a receipt", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "Sarah", kind: "human" });
    const { primary: b } = createContact(db, { name: "Sarah", kind: "human" });

    const receipt = dismissDuplicate(db, a.id, b.id, "confirmed different");

    const left = Math.min(a.id, b.id);
    const right = Math.max(a.id, b.id);
    deepStrictEqual(receipt.primary, {
      leftContactId: left,
      rightContactId: right,
    });

    const row = db
      .prepare(
        "SELECT left_id, right_id, reason FROM dismissed_duplicates WHERE left_id = ? AND right_id = ?",
      )
      .get(left, right) as
      | { left_id: number; right_id: number; reason: string }
      | undefined;
    strictEqual(row?.left_id, left);
    strictEqual(row?.right_id, right);
    strictEqual(row?.reason, "confirmed different");

    db.close();
  });

  it("canonicalizes caller-provided order (right > left)", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "Sarah", kind: "human" });
    const { primary: b } = createContact(db, { name: "Sarah", kind: "human" });

    // Pass them in reversed order
    dismissDuplicate(db, b.id, a.id);

    const left = Math.min(a.id, b.id);
    const right = Math.max(a.id, b.id);
    const row = db
      .prepare(
        "SELECT left_id FROM dismissed_duplicates WHERE left_id = ? AND right_id = ?",
      )
      .get(left, right) as { left_id: number } | undefined;
    strictEqual(row?.left_id, left);

    db.close();
  });

  it("upserts — re-dismiss updates reason and timestamp", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "Sarah", kind: "human" });
    const { primary: b } = createContact(db, { name: "Sarah", kind: "human" });

    dismissDuplicate(db, a.id, b.id, "first reason", 1000);
    dismissDuplicate(db, a.id, b.id, "updated reason", 2000);

    const left = Math.min(a.id, b.id);
    const right = Math.max(a.id, b.id);
    const rows = db
      .prepare(
        "SELECT reason, dismissed_at FROM dismissed_duplicates WHERE left_id = ? AND right_id = ?",
      )
      .all(left, right) as { reason: string; dismissed_at: number }[];
    strictEqual(rows.length, 1);
    strictEqual(rows[0]?.reason, "updated reason");
    strictEqual(rows[0]?.dismissed_at, 2000);

    db.close();
  });

  it("throws AffinityValidationError when both IDs are the same", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "Sarah", kind: "human" });

    throws(
      () => dismissDuplicate(db, a.id, a.id),
      (err: unknown) => err instanceof AffinityValidationError,
    );

    db.close();
  });

  it("throws AffinityNotFoundError for unknown contact", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "Sarah", kind: "human" });

    throws(
      () => dismissDuplicate(db, a.id, 99999),
      (err: unknown) => err instanceof AffinityNotFoundError,
    );

    db.close();
  });

  it("throws AffinityStateError for merged contact", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: winner } = createContact(db, {
      name: "Sarah",
      kind: "human",
    });
    const { primary: loser } = createContact(db, {
      name: "Sarah",
      kind: "human",
    });
    const { primary: other } = createContact(db, {
      name: "Sarah",
      kind: "human",
    });
    mergeContacts(db, {
      winnerContactId: winner.id,
      loserContactId: loser.id,
    });

    throws(
      () => dismissDuplicate(db, loser.id, other.id),
      (err: unknown) => err instanceof AffinityStateError,
    );

    db.close();
  });
});
