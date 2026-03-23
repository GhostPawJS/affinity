import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { inspectAffinityItemToolHandler } from "../tools/inspect_affinity_item_tool.ts";
import { manageContactToolHandler } from "../tools/manage_contact_tool.ts";
import { manageIdentityToolHandler } from "../tools/manage_identity_tool.ts";
import { reviewAffinityToolHandler } from "../tools/review_affinity_tool.ts";
import {
  createSkillTestDb,
  expectError,
  expectSuccess,
} from "./skill_test_utils.ts";

describe("bootstrap_and_cold_start skill scenario", () => {
  it("bootstraps a clean owner profile from zero", async () => {
    const db = await createSkillTestDb();

    const missingOwner = expectError(
      inspectAffinityItemToolHandler(db, { kind: "owner_profile" }),
    );
    strictEqual(missingOwner.error.code, "not_found");

    const owner = expectSuccess(
      manageContactToolHandler(db, {
        action: "create",
        input: { name: "Operator", kind: "human", bootstrapOwner: true },
      }),
    );

    const identity = expectSuccess(
      manageIdentityToolHandler(db, {
        action: "add",
        contact: { contactId: owner.data.primary.id },
        input: { type: "email", value: "operator@example.com" },
      }),
    );
    strictEqual(identity.data.primary.contactId, owner.data.primary.id);

    const ownerProfile = expectSuccess(
      inspectAffinityItemToolHandler(db, { kind: "owner_profile" }),
    );
    if (ownerProfile.data.kind !== "owner_profile") {
      throw new Error("expected owner profile");
    }
    strictEqual(ownerProfile.data.detail.contact.name, "Operator");

    const contacts = expectSuccess(
      reviewAffinityToolHandler(db, { view: "contacts.list" }),
    );
    strictEqual(contacts.data.count, 1);

    db.close();
  });
});
