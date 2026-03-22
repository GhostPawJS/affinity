import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import {
  getContactProfile,
  listOpenCommitments,
  listOwnerSocialLinks,
  listUpcomingDates,
} from "../read.ts";
import {
  addDateAnchor,
  addIdentity,
  createContact,
  recordCommitment,
  recordInteraction,
  recordTransaction,
  setStructuralTie,
} from "../write.ts";

describe("concept validation scenarios", () => {
  it("supports the cold-start personal CRM flow", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: contact } = createContact(db, {
      name: "Pat",
      kind: "human",
    });
    addIdentity(db, contact.id, { type: "email", value: "pat@example.com" });
    const interaction = recordInteraction(db, {
      type: "conversation",
      occurredAt: 10,
      summary: "quick hello",
      significance: 4,
      participants: [
        {
          contactId: owner.id,
          role: "actor",
          directionality: "owner_initiated",
        },
        {
          contactId: contact.id,
          role: "recipient",
          directionality: "other_initiated",
        },
      ],
    });
    const effect = interaction.derivedEffects[0];
    ok(effect !== undefined);
    strictEqual(interaction.affectedLinks.length, 1);
    strictEqual(effect.rankAfter <= 1, true);
    strictEqual(effect.stateAfter, "active");
    const profile = getContactProfile(db, contact.id);
    ok(profile !== null);
    strictEqual(profile.identities.length, 1);
    strictEqual(profile.topLinks.length, 1);
    db.close();
  });

  it("supports the solo-business CRM portfolio flow", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: client } = createContact(db, {
      name: "ClientCo",
      kind: "company",
    });
    const { primary: vendor } = createContact(db, {
      name: "VendorCo",
      kind: "company",
    });
    const { primary: service } = createContact(db, {
      name: "SupportDesk",
      kind: "service",
    });
    addIdentity(db, client.id, { type: "account_id", value: "client-1" });
    addIdentity(db, vendor.id, { type: "email", value: "vendor@example.com" });
    addIdentity(db, service.id, { type: "email", value: "help@example.com" });
    setStructuralTie(db, {
      fromContactId: owner.id,
      toContactId: client.id,
      kind: "client_of",
    });
    recordTransaction(db, {
      occurredAt: 20,
      summary: "invoice paid",
      significance: 5,
      participants: [
        { contactId: owner.id, role: "actor", directionality: "mutual" },
        { contactId: client.id, role: "recipient", directionality: "mutual" },
      ],
    });
    const commitment = recordCommitment(db, {
      commitmentType: "agreement",
      occurredAt: 21,
      summary: "renew support plan",
      significance: 6,
      dueAt: Date.now() + 30 * 86_400_000,
      participants: [
        { contactId: owner.id, role: "actor", directionality: "mutual" },
        { contactId: service.id, role: "recipient", directionality: "mutual" },
      ],
    });
    addDateAnchor(db, {
      target: { kind: "contact", contactId: client.id },
      recurrenceKind: "renewal",
      anchorMonth: 6,
      anchorDay: 1,
      summary: "contract renewal",
      significance: 7,
    });
    const ownerLinks = listOwnerSocialLinks(db);
    strictEqual(
      ownerLinks.some((row) => row.toContactId === client.id),
      true,
    );
    strictEqual(
      ownerLinks.some((row) => row.toContactId === service.id),
      true,
    );
    const commitmentLinkId = commitment.affectedLinks[0];
    ok(commitmentLinkId !== undefined);
    const commitments = listOpenCommitments(db, {
      linkId: commitmentLinkId,
    });
    strictEqual(commitments.length, 1);
    const upcoming = listUpcomingDates(db, { recurrenceKind: "renewal" });
    strictEqual(upcoming.length, 1);
    db.close();
  });
});
