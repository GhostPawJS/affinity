import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { manageContactToolHandler } from "../tools/manage_contact_tool.ts";
import { manageDateAnchorToolHandler } from "../tools/manage_date_anchor_tool.ts";
import { reviewAffinityToolHandler } from "../tools/review_affinity_tool.ts";
import {
  createSkillTestDb,
  expectError,
  expectSuccess,
} from "./skill_test_utils.ts";

describe("manage_recurring_dates_and_reminders skill scenario", () => {
  it("keeps yearly anchors reviewable and removable", async () => {
    const db = await createSkillTestDb();

    const contact = expectSuccess(
      manageContactToolHandler(db, {
        action: "create",
        input: { name: "Ada", kind: "human" },
      }),
    );

    const added = expectSuccess(
      manageDateAnchorToolHandler(db, {
        action: "add",
        input: {
          target: { kind: "contact", contact: { contactId: contact.data.primary.id } },
          recurrenceKind: "birthday",
          anchorMonth: 6,
          anchorDay: 1,
          summary: "Ada birthday",
          significance: 7,
        },
      }),
    );

    const upcoming = expectSuccess(
      reviewAffinityToolHandler(db, {
        view: "dates.upcoming",
        horizonDays: 400,
      }),
    );
    strictEqual(upcoming.data.count >= 1, true);

    expectSuccess(
      manageDateAnchorToolHandler(db, {
        action: "revise",
        anchorEventId: added.data.primary.id,
        patch: { summary: "Ada Birthday" },
      }),
    );

    expectSuccess(
      manageDateAnchorToolHandler(db, {
        action: "remove",
        anchorEventId: added.data.primary.id,
      }),
    );

    const removedTwice = expectError(
      manageDateAnchorToolHandler(db, {
        action: "remove",
        anchorEventId: added.data.primary.id,
      }),
    );
    strictEqual(removedTwice.error.kind, "domain");

    db.close();
  });
});
