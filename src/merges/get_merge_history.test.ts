import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { getMergeHistory } from "./get_merge_history.ts";
import { mergeContacts } from "./merge_contacts.ts";

describe("getMergeHistory", () => {
  it("returns merge records and supports pagination", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    const { primary: c } = createContact(db, { name: "C", kind: "human" });
    mergeContacts(db, {
      winnerContactId: owner.id,
      loserContactId: a.id,
      now: 100,
    });
    mergeContacts(db, {
      winnerContactId: owner.id,
      loserContactId: b.id,
      now: 200,
    });
    mergeContacts(db, {
      winnerContactId: owner.id,
      loserContactId: c.id,
      now: 300,
    });
    const all = getMergeHistory(db, owner.id);
    strictEqual(all.length, 3);
    strictEqual(all[0]?.mergedAt, 300);
    const page = getMergeHistory(db, owner.id, { limit: 2 });
    strictEqual(page.length, 2);
    const next = getMergeHistory(db, owner.id, { limit: 2, offset: 2 });
    strictEqual(next.length, 1);
    db.close();
  });
});
