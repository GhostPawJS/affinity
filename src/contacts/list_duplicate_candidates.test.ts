import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { addIdentity } from "../identities/add_identity.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { dismissDuplicate } from "../merges/dismiss_duplicate.ts";
import { mergeContacts } from "../merges/merge_contacts.ts";
import { undismissDuplicate } from "../merges/undismiss_duplicate.ts";
import { createContact } from "./create_contact.ts";
import { listDuplicateCandidates } from "./list_duplicate_candidates.ts";

describe("listDuplicateCandidates", () => {
  it("returns fuzzy name matches and honors exactOnly", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: left } = createContact(db, {
      name: "Ada Lovelace",
      kind: "human",
    });
    const { primary: right } = createContact(db, {
      name: "Ada L.",
      kind: "human",
    });
    const { primary: other } = createContact(db, {
      name: "Ada Lovelace",
      kind: "human",
    });
    addIdentity(db, left.id, { type: "email", value: "ada@example.com" });
    const matches = listDuplicateCandidates(db);
    strictEqual(matches.length >= 1, true);
    strictEqual(
      matches.some(
        (candidate) =>
          [candidate.leftContactId, candidate.rightContactId].includes(
            other.id,
          ) && candidate.matchReason === "name similarity",
      ),
      true,
    );
    strictEqual(listDuplicateCandidates(db, { exactOnly: true }).length, 0);
    strictEqual(
      listDuplicateCandidates(db, { contactIds: [left.id, right.id] }).every(
        (candidate) =>
          [candidate.leftContactId, candidate.rightContactId].every((id) =>
            [left.id, right.id].includes(id),
          ),
      ),
      true,
    );
    db.close();
  });

  it("excludes dismissed pairs by default", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, {
      name: "Sarah Chen",
      kind: "human",
    });
    const { primary: b } = createContact(db, {
      name: "Sarah Chen",
      kind: "human",
    });

    dismissDuplicate(db, a.id, b.id, "confirmed different people");

    const results = listDuplicateCandidates(db);
    strictEqual(
      results.some(
        (c) =>
          (c.leftContactId === a.id || c.rightContactId === a.id) &&
          (c.leftContactId === b.id || c.rightContactId === b.id),
      ),
      false,
    );

    db.close();
  });

  it("includes dismissed pairs with dismissed flag when includeDismissed is true", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, {
      name: "Sarah Chen",
      kind: "human",
    });
    const { primary: b } = createContact(db, {
      name: "Sarah Chen",
      kind: "human",
    });

    dismissDuplicate(db, a.id, b.id);

    const results = listDuplicateCandidates(db, { includeDismissed: true });
    const match = results.find(
      (c) =>
        (c.leftContactId === a.id || c.rightContactId === a.id) &&
        (c.leftContactId === b.id || c.rightContactId === b.id),
    );
    strictEqual(match !== undefined, true);
    strictEqual(match?.dismissed, true);

    db.close();
  });

  it("pair reappears after undismiss", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, {
      name: "Sarah Chen",
      kind: "human",
    });
    const { primary: b } = createContact(db, {
      name: "Sarah Chen",
      kind: "human",
    });

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

  it("non-dismissed pairs do not have the dismissed flag", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "Alex", kind: "human" });
    const { primary: b } = createContact(db, { name: "Alex", kind: "human" });

    const results = listDuplicateCandidates(db);
    const match = results.find(
      (c) =>
        (c.leftContactId === a.id || c.rightContactId === a.id) &&
        (c.leftContactId === b.id || c.rightContactId === b.id),
    );
    strictEqual(match !== undefined, true);
    strictEqual(match?.dismissed, undefined);

    db.close();
  });

  it("excludes merged contacts from candidate pairs", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: winner } = createContact(db, {
      name: "Ada",
      kind: "human",
    });
    const { primary: loser } = createContact(db, {
      name: "Ada",
      kind: "human",
    });
    addIdentity(db, winner.id, { type: "email", value: "ada@example.com" });
    addIdentity(db, loser.id, { type: "phone", value: "1234" });
    mergeContacts(db, { winnerContactId: winner.id, loserContactId: loser.id });
    const matches = listDuplicateCandidates(db);
    strictEqual(
      matches.some(
        (candidate) =>
          candidate.leftContactId === loser.id ||
          candidate.rightContactId === loser.id,
      ),
      false,
    );
    db.close();
  });
});
