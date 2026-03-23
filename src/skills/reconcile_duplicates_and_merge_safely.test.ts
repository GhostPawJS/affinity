import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { inspectAffinityItemToolHandler } from "../tools/inspect_affinity_item_tool.ts";
import { manageContactToolHandler } from "../tools/manage_contact_tool.ts";
import { manageIdentityToolHandler } from "../tools/manage_identity_tool.ts";
import { mergeContactsToolHandler } from "../tools/merge_contacts_tool.ts";
import { reviewAffinityToolHandler } from "../tools/review_affinity_tool.ts";
import {
  createSkillTestDb,
  expectError,
  expectSuccess,
} from "./skill_test_utils.ts";

describe("reconcile_duplicates_and_merge_safely skill scenario", () => {
  it("reviews likely duplicates, inspects both sides, merges once, and preserves lineage", async () => {
    const db = await createSkillTestDb();

    const winner = expectSuccess(
      manageContactToolHandler(db, {
        action: "create",
        input: { name: "Ada Lovelace", kind: "human" },
      }),
    );
    const loser = expectSuccess(
      manageContactToolHandler(db, {
        action: "create",
        input: { name: "Ada L.", kind: "human" },
      }),
    );

    expectSuccess(
      manageIdentityToolHandler(db, {
        action: "add",
        contact: { contactId: winner.data.primary.id },
        input: { type: "email", value: "ada@example.com" },
      }),
    );
    expectSuccess(
      manageIdentityToolHandler(db, {
        action: "add",
        contact: { contactId: loser.data.primary.id },
        input: { type: "email", value: "adal@example.com" },
      }),
    );

    const duplicates = expectSuccess(
      reviewAffinityToolHandler(db, { view: "contacts.duplicates" }),
    );
    strictEqual(duplicates.data.count >= 1, true);

    const winnerProfile = expectSuccess(
      inspectAffinityItemToolHandler(db, {
        kind: "contact_profile",
        contact: { contactId: winner.data.primary.id },
      }),
    );
    const loserProfile = expectSuccess(
      inspectAffinityItemToolHandler(db, {
        kind: "contact_profile",
        contact: { contactId: loser.data.primary.id },
      }),
    );
    if (
      winnerProfile.data.kind !== "contact_profile" ||
      loserProfile.data.kind !== "contact_profile"
    ) {
      throw new Error("expected contact profiles");
    }

    expectSuccess(
      mergeContactsToolHandler(db, {
        winner: { contactId: winner.data.primary.id },
        loser: { contactId: loser.data.primary.id },
        reasonSummary: "Same person discovered during duplicate review",
      }),
    );

    const history = expectSuccess(
      reviewAffinityToolHandler(db, {
        view: "merges.history",
        contact: { contactId: winner.data.primary.id },
      }),
    );
    strictEqual(history.data.count, 1);

    const mergedAgain = expectError(
      mergeContactsToolHandler(db, {
        winner: { contactId: winner.data.primary.id },
        loser: { contactId: loser.data.primary.id },
        reasonSummary: "Repeat merge should fail",
      }),
    );
    strictEqual(mergedAgain.error.kind, "domain");

    db.close();
  });
});
