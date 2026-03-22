import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { listOpenCommitments } from "./list_open_commitments.ts";
import { recordCommitment } from "./record_commitment.ts";

const DAY_MS = 86_400_000;

describe("listOpenCommitments", () => {
  it("filters by due horizon, contact, type, and link scope", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    const promise = recordCommitment(db, {
      commitmentType: "promise",
      occurredAt: 10,
      summary: "follow up",
      significance: 5,
      dueAt: 10 + 5 * DAY_MS,
      participants: [
        {
          contactId: owner.id,
          role: "actor",
          directionality: "owner_initiated",
        },
        {
          contactId: a.id,
          role: "recipient",
          directionality: "other_initiated",
        },
      ],
    });
    recordCommitment(db, {
      commitmentType: "agreement",
      occurredAt: 10,
      summary: "longer term",
      significance: 5,
      dueAt: 10 + 90 * DAY_MS,
      participants: [
        { contactId: owner.id, role: "actor", directionality: "mutual" },
        { contactId: b.id, role: "recipient", directionality: "mutual" },
      ],
    });
    const byHorizon = listOpenCommitments(
      db,
      { horizonDays: 10 },
      { since: 10 },
    );
    strictEqual(byHorizon.length, 1);
    strictEqual(byHorizon[0]?.eventId, promise.primary.id);

    const byContact = listOpenCommitments(db, { contactId: a.id });
    strictEqual(byContact.length, 1);
    strictEqual(byContact[0]?.eventId, promise.primary.id);

    const byType = listOpenCommitments(db, { commitmentType: "agreement" });
    strictEqual(byType.length, 1);
    strictEqual(byType[0]?.type, "agreement");

    const promiseLinkId = promise.affectedLinks[0];
    ok(promiseLinkId !== undefined);
    const byLink = listOpenCommitments(db, {
      linkId: promiseLinkId,
    });
    strictEqual(byLink.length, 1);
    strictEqual(byLink[0]?.eventId, promise.primary.id);
    db.close();
  });
});
