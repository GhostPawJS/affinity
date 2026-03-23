import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { manageContactToolHandler } from "../tools/manage_contact_tool.ts";
import { recordEventToolHandler } from "../tools/record_event_tool.ts";
import { reviewAffinityToolHandler } from "../tools/review_affinity_tool.ts";
import {
  createSkillTestDb,
  expectClarification,
  expectSuccess,
} from "./skill_test_utils.ts";

describe("capture_transactions_and_commercial_events skill scenario", () => {
  it("records commercial events as transactions and reviews them as such", async () => {
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
        input: { name: "Northwind Client", kind: "company" },
      }),
    );

    const transaction = expectSuccess(
      recordEventToolHandler(db, {
        kind: "transaction",
        input: {
          occurredAt: 10,
          summary: "Northwind paid the discovery invoice",
          significance: 6,
          participants: [
            { contactId: owner.data.primary.id, role: "actor", directionality: "mutual" },
            { contactId: client.data.primary.id, role: "recipient", directionality: "mutual" },
          ],
        },
      }),
    );
    strictEqual(transaction.data.primary.type, "transaction");

    const journal = expectSuccess(
      reviewAffinityToolHandler(db, {
        view: "events.contact_journal",
        contact: { contactId: client.data.primary.id },
        eventTypes: ["transaction"],
      }),
    );
    strictEqual(journal.data.count, 1);

    const emptyTypes = expectClarification(
      reviewAffinityToolHandler(db, {
        view: "events.contact_journal",
        contact: { contactId: client.data.primary.id },
        eventTypes: [],
      }),
    );
    strictEqual(emptyTypes.clarification.missing[0], "eventTypes");

    db.close();
  });
});
