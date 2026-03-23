import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { inspectAffinityItemToolHandler } from "../tools/inspect_affinity_item_tool.ts";
import { manageContactToolHandler } from "../tools/manage_contact_tool.ts";
import { manageRelationshipToolHandler } from "../tools/manage_relationship_tool.ts";
import { recordEventToolHandler } from "../tools/record_event_tool.ts";
import { reviewAffinityToolHandler } from "../tools/review_affinity_tool.ts";
import {
  createSkillTestDb,
  expectClarification,
  expectSuccess,
} from "./skill_test_utils.ts";

describe("record_direct_evidence_well skill scenario", () => {
  it("records direct evidence, milestones, and later interprets the bond in context", async () => {
    const db = await createSkillTestDb();

    const owner = expectSuccess(
      manageContactToolHandler(db, {
        action: "create",
        input: { name: "Me", kind: "human", bootstrapOwner: true },
      }),
    );
    const ada = expectSuccess(
      manageContactToolHandler(db, {
        action: "create",
        input: { name: "Ada", kind: "human" },
      }),
    );
    const bob = expectSuccess(
      manageContactToolHandler(db, {
        action: "create",
        input: { name: "Bob", kind: "human" },
      }),
    );

    const interaction = expectSuccess(
      recordEventToolHandler(db, {
        kind: "interaction",
        input: {
          type: "conversation",
          occurredAt: 10,
          summary: "Coffee catch-up with Ada and Bob",
          significance: 6,
          participants: [
            {
              contactId: owner.data.primary.id,
              role: "actor",
              directionality: "mutual",
            },
            {
              contactId: ada.data.primary.id,
              role: "recipient",
              directionality: "mutual",
            },
            {
              contactId: bob.data.primary.id,
              role: "recipient",
              directionality: "mutual",
            },
          ],
        },
      }),
    );
    const adaLinkId = interaction.data.affectedLinks[0];
    if (adaLinkId === undefined) {
      throw new Error("expected affected link");
    }

    expectSuccess(
      recordEventToolHandler(db, {
        kind: "milestone",
        input: {
          occurredAt: 20,
          summary: "Ada introduced a major client",
          significance: 9,
          participants: [
            {
              contactId: owner.data.primary.id,
              role: "actor",
              directionality: "mutual",
            },
            {
              contactId: ada.data.primary.id,
              role: "recipient",
              directionality: "mutual",
            },
          ],
        },
      }),
    );

    expectSuccess(
      manageRelationshipToolHandler(db, {
        action: "revise_bond",
        link: { linkId: adaLinkId },
        bond: "Trusted collaborator after several strong interactions",
      }),
    );

    const journal = expectSuccess(
      reviewAffinityToolHandler(db, {
        view: "events.contact_journal",
        contact: { contactId: ada.data.primary.id },
      }),
    );
    strictEqual(journal.data.count >= 2, true);

    const detail = expectSuccess(
      inspectAffinityItemToolHandler(db, {
        kind: "link",
        link: { linkId: adaLinkId },
      }),
    );
    if (detail.data.kind !== "link") {
      throw new Error("expected link detail");
    }
    strictEqual(
      detail.data.detail.link.bond,
      "Trusted collaborator after several strong interactions",
    );

    const missingTarget = expectClarification(
      reviewAffinityToolHandler(db, { view: "events.contact_journal" }),
    );
    strictEqual(missingTarget.clarification.missing[0], "contact");

    db.close();
  });
});
