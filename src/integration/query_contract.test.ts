import { throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { listContacts } from "../contacts/list_contacts.ts";
import { searchContacts } from "../contacts/search_contacts.ts";
import { getContactJournal } from "../events/get_contact_journal.ts";
import { listMoments } from "../events/list_moments.ts";
import { listOpenCommitments } from "../events/list_open_commitments.ts";
import { recordCommitment } from "../events/record_commitment.ts";
import { recordInteraction } from "../events/record_interaction.ts";
import { getAffinityChart } from "../graph/get_affinity_chart.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { getLinkTimeline } from "../links/get_link_timeline.ts";

describe("read query contract", () => {
  it("rejects unsupported custom ordering on guarded reads", async () => {
    const db = await createInitializedAffinityDb();
    createContact(db, { name: "Me", kind: "human", bootstrapOwner: true });
    createContact(db, { name: "A", kind: "human" });
    recordCommitment(db, {
      commitmentType: "promise",
      occurredAt: 1,
      summary: "follow up",
      significance: 5,
      participants: [
        { contactId: 1, role: "actor", directionality: "owner_initiated" },
        { contactId: 2, role: "recipient", directionality: "other_initiated" },
      ],
    });
    throws(
      () => listContacts(db, undefined, { sort: "name" }),
      (error: unknown) => error instanceof AffinityValidationError,
    );
    throws(
      () => searchContacts(db, "a", undefined, { descending: true }),
      (error: unknown) => error instanceof AffinityValidationError,
    );
    throws(
      () => listOpenCommitments(db, undefined, { sort: "dueAt" }),
      (error: unknown) => error instanceof AffinityValidationError,
    );
    const interaction = recordInteraction(db, {
      type: "conversation",
      occurredAt: 2,
      summary: "hi",
      significance: 5,
      participants: [
        { contactId: 1, role: "actor", directionality: "mutual" },
        { contactId: 2, role: "recipient", directionality: "mutual" },
      ],
    });
    throws(
      () => getContactJournal(db, 1, { sort: "occurredAt" }),
      (error: unknown) => error instanceof AffinityValidationError,
    );
    throws(
      () =>
        getLinkTimeline(db, interaction.affectedLinks[0] as number, {
          descending: true,
        }),
      (error: unknown) => error instanceof AffinityValidationError,
    );
    throws(
      () => listMoments(db, undefined, { sort: "impact" }),
      (error: unknown) => error instanceof AffinityValidationError,
    );
    db.close();
  });
});
