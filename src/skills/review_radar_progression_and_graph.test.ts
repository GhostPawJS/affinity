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

describe("review_radar_progression_and_graph skill scenario", () => {
  it("reviews score surfaces and asks for clarification before guessing on ambiguous links", async () => {
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
    const ben = expectSuccess(
      manageContactToolHandler(db, {
        action: "create",
        input: { name: "Ben", kind: "human" },
      }),
    );

    const ownerAda = expectSuccess(
      recordEventToolHandler(db, {
        kind: "interaction",
        input: {
          type: "support",
          occurredAt: 10,
          summary: "Helped Ada prepare for a major meeting",
          significance: 7,
          participants: [
            { contactId: owner.data.primary.id, role: "actor", directionality: "mutual" },
            { contactId: ada.data.primary.id, role: "recipient", directionality: "mutual" },
          ],
        },
      }),
    );
    expectSuccess(
      recordEventToolHandler(db, {
        kind: "interaction",
        input: {
          type: "conversation",
          occurredAt: 20,
          summary: "Weekly check-in with Ben",
          significance: 5,
          participants: [
            { contactId: owner.data.primary.id, role: "actor", directionality: "mutual" },
            { contactId: ben.data.primary.id, role: "recipient", directionality: "mutual" },
          ],
        },
      }),
    );
    expectSuccess(
      manageRelationshipToolHandler(db, {
        action: "set_structural_tie",
        from: { contactId: owner.data.primary.id },
        to: { contactId: ada.data.primary.id },
        input: { kind: "friend_of" },
      }),
    );

    const radar = expectSuccess(
      reviewAffinityToolHandler(db, { view: "links.radar" }),
    );
    strictEqual(radar.data.count >= 1, true);

    const readiness = expectSuccess(
      reviewAffinityToolHandler(db, { view: "links.progression_readiness" }),
    );
    strictEqual(readiness.data.count >= 1, true);

    const chart = expectSuccess(
      reviewAffinityToolHandler(db, { view: "graph.chart" }),
    );
    strictEqual((chart.data.chart?.nodes.length ?? 0) >= 3, true);

    const ambiguous = expectClarification(
      inspectAffinityItemToolHandler(db, {
        kind: "link",
        link: {
          endpoints: {
            fromContactId: owner.data.primary.id,
            toContactId: ada.data.primary.id,
          },
        },
      }),
    );
    strictEqual(ambiguous.clarification.code, "ambiguous_target");

    const relationalLinkId = ownerAda.data.affectedLinks[0];
    if (relationalLinkId === undefined) {
      throw new Error("expected relational link");
    }
    const exact = expectSuccess(
      inspectAffinityItemToolHandler(db, {
        kind: "link",
        link: { linkId: relationalLinkId },
      }),
    );
    if (exact.data.kind !== "link") {
      throw new Error("expected link detail");
    }
    strictEqual(exact.data.detail.counterparty.name, "Ada");

    db.close();
  });
});
