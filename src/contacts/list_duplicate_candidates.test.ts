import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { addIdentity } from "../identities/add_identity.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { mergeContacts } from "../merges/merge_contacts.ts";
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
