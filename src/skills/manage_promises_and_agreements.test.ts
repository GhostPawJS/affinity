import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { manageCommitmentToolHandler } from "../tools/manage_commitment_tool.ts";
import { manageContactToolHandler } from "../tools/manage_contact_tool.ts";
import { reviewAffinityToolHandler } from "../tools/review_affinity_tool.ts";
import {
  createSkillTestDb,
  expectError,
  expectSuccess,
} from "./skill_test_utils.ts";

describe("manage_promises_and_agreements skill scenario", () => {
  it("tracks an open promise through review to resolution and rejects double resolution", async () => {
    const db = await createSkillTestDb();

    const owner = expectSuccess(
      manageContactToolHandler(db, {
        action: "create",
        input: { name: "Me", kind: "human", bootstrapOwner: true },
      }),
    );
    const client = expectSuccess(
      manageContactToolHandler(db, {
        action: "create",
        input: { name: "Ada Client", kind: "human" },
      }),
    );

    const recorded = expectSuccess(
      manageCommitmentToolHandler(db, {
        action: "record",
        input: {
          commitmentType: "promise",
          occurredAt: 10,
          dueAt: 30,
          summary: "Send the revised project recap",
          significance: 6,
          participants: [
            { contactId: owner.data.primary.id, role: "actor" },
            { contactId: client.data.primary.id, role: "recipient" },
          ],
        },
      }),
    );

    const open = expectSuccess(
      reviewAffinityToolHandler(db, { view: "commitments.open" }),
    );
    strictEqual(open.data.count, 1);

    expectSuccess(
      manageCommitmentToolHandler(db, {
        action: "resolve",
        commitmentEventId: recorded.data.primary.id,
        resolution: "kept",
      }),
    );

    const closed = expectSuccess(
      reviewAffinityToolHandler(db, { view: "commitments.open" }),
    );
    strictEqual(closed.data.count, 0);

    const resolvedTwice = expectError(
      manageCommitmentToolHandler(db, {
        action: "resolve",
        commitmentEventId: recorded.data.primary.id,
        resolution: "kept",
      }),
    );
    strictEqual(resolvedTwice.error.kind, "domain");

    db.close();
  });
});
