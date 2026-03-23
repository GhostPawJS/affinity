import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { inspectAffinityItemToolHandler } from "../tools/inspect_affinity_item_tool.ts";
import { manageContactToolHandler } from "../tools/manage_contact_tool.ts";
import { manageIdentityToolHandler } from "../tools/manage_identity_tool.ts";
import { searchAffinityToolHandler } from "../tools/search_affinity_tool.ts";
import {
  createSkillTestDb,
  expectError,
  expectSuccess,
} from "./skill_test_utils.ts";

describe("identify_and_locate_contacts skill scenario", () => {
  it("prefers natural keys, confirms exact targets, and shows fuzzy lookup limits", async () => {
    const db = await createSkillTestDb();

    const ada = expectSuccess(
      manageContactToolHandler(db, {
        action: "create",
        input: { name: "Ada", kind: "human" },
      }),
    );
    const adaIdentity = expectSuccess(
      manageIdentityToolHandler(db, {
        action: "add",
        contact: { contactId: ada.data.primary.id },
        input: { type: "email", value: "ada@example.com" },
      }),
    );
    expectSuccess(
      manageIdentityToolHandler(db, {
        action: "verify",
        identityId: adaIdentity.data.primary.id,
        verifiedAt: 100,
      }),
    );

    expectSuccess(
      manageContactToolHandler(db, {
        action: "create",
        input: { name: "Ada", kind: "human" },
      }),
    );

    const exact = expectSuccess(
      searchAffinityToolHandler(db, { query: "email:ada@example.com" }),
    );
    strictEqual(exact.data.items.length, 1);

    const fuzzy = expectSuccess(searchAffinityToolHandler(db, { query: "Ada" }));
    strictEqual(fuzzy.data.items.length >= 2, true);

    const profile = expectSuccess(
      inspectAffinityItemToolHandler(db, {
        kind: "contact_profile",
        contact: { identity: { type: "email", value: "ada@example.com" } },
      }),
    );
    if (profile.data.kind !== "contact_profile") {
      throw new Error("expected contact profile");
    }
    strictEqual(profile.data.detail.contact.name, "Ada");

    const missing = expectError(
      inspectAffinityItemToolHandler(db, {
        kind: "contact_profile",
        contact: { identity: { type: "email", value: "missing@example.com" } },
      }),
    );
    strictEqual(missing.error.code, "not_found");

    db.close();
  });
});
