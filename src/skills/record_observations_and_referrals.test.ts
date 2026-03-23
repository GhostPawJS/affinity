import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { inspectAffinityItemToolHandler } from "../tools/inspect_affinity_item_tool.ts";
import { manageContactToolHandler } from "../tools/manage_contact_tool.ts";
import { recordEventToolHandler } from "../tools/record_event_tool.ts";
import { reviewAffinityToolHandler } from "../tools/review_affinity_tool.ts";
import {
  createSkillTestDb,
  expectSuccess,
} from "./skill_test_utils.ts";

describe("record_observations_and_referrals skill scenario", () => {
  it("captures third-party observational evidence without over-inferring group structure", async () => {
    const db = await createSkillTestDb();

    expectSuccess(
      manageContactToolHandler(db, {
        action: "create",
        input: { name: "Me", kind: "human", bootstrapOwner: true },
      }),
    );
    const referrer = expectSuccess(
      manageContactToolHandler(db, {
        action: "create",
        input: { name: "Rita Referrer", kind: "human" },
      }),
    );
    const prospect = expectSuccess(
      manageContactToolHandler(db, {
        action: "create",
        input: { name: "Paul Prospect", kind: "human" },
      }),
    );
    const partner = expectSuccess(
      manageContactToolHandler(db, {
        action: "create",
        input: { name: "Priya Partner", kind: "human" },
      }),
    );

    const referral = expectSuccess(
      recordEventToolHandler(db, {
        kind: "observation",
        input: {
          occurredAt: 10,
          summary: "Rita referred Paul to me",
          significance: 4,
          participants: [
            { contactId: referrer.data.primary.id, role: "observer" },
            { contactId: prospect.data.primary.id, role: "subject" },
          ],
        },
      }),
    );
    strictEqual(referral.data.affectedLinks.length, 1);

    const observed = expectSuccess(
      reviewAffinityToolHandler(db, { view: "links.observed" }),
    );
    strictEqual(observed.data.count >= 1, true);

    const observedLink = expectSuccess(
      inspectAffinityItemToolHandler(db, {
        kind: "link",
        link: {
          endpoints: {
            fromContactId: referrer.data.primary.id,
            toContactId: prospect.data.primary.id,
          },
        },
      }),
    );
    if (observedLink.data.kind !== "link") {
      throw new Error("expected link detail");
    }
    strictEqual(observedLink.data.detail.link.kind, "observed");

    const groupObservation = expectSuccess(
      recordEventToolHandler(db, {
        kind: "observation",
        input: {
          occurredAt: 20,
          summary: "Saw Rita, Paul, and Priya together",
          significance: 3,
          participants: [
            { contactId: referrer.data.primary.id, role: "observer" },
            { contactId: prospect.data.primary.id, role: "subject" },
            { contactId: partner.data.primary.id, role: "subject" },
          ],
        },
      }),
    );
    strictEqual(groupObservation.data.affectedLinks.length, 0);

    db.close();
  });
});
