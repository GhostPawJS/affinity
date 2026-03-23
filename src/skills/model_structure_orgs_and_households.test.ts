import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { inspectAffinityItemToolHandler } from "../tools/inspect_affinity_item_tool.ts";
import { manageContactToolHandler } from "../tools/manage_contact_tool.ts";
import { manageRelationshipToolHandler } from "../tools/manage_relationship_tool.ts";
import {
  createSkillTestDb,
  expectError,
  expectSuccess,
} from "./skill_test_utils.ts";

describe("model_structure_orgs_and_households skill scenario", () => {
  it("models and later removes a structural tie without treating it as live relationship quality", async () => {
    const db = await createSkillTestDb();

    const consultant = expectSuccess(
      manageContactToolHandler(db, {
        action: "create",
        input: { name: "Nina Consultant", kind: "human" },
      }),
    );
    const agency = expectSuccess(
      manageContactToolHandler(db, {
        action: "create",
        input: { name: "Northwind Agency", kind: "company" },
      }),
    );

    const structural = expectSuccess(
      manageRelationshipToolHandler(db, {
        action: "set_structural_tie",
        from: { contactId: consultant.data.primary.id },
        to: { contactId: agency.data.primary.id },
        input: { kind: "works_at", role: "designer" },
      }),
    );

    const detail = expectSuccess(
      inspectAffinityItemToolHandler(db, {
        kind: "link",
        link: { linkId: structural.data.primary.id },
      }),
    );
    if (detail.data.kind !== "link") {
      throw new Error("expected link detail");
    }
    strictEqual(detail.data.detail.link.kind, "works_at");

    expectSuccess(
      manageRelationshipToolHandler(db, {
        action: "remove_structural_tie",
        link: { linkId: structural.data.primary.id },
        removedAt: 200,
      }),
    );

    const alreadyRemoved = expectError(
      manageRelationshipToolHandler(db, {
        action: "remove_structural_tie",
        link: { linkId: structural.data.primary.id },
        removedAt: 201,
      }),
    );
    strictEqual(alreadyRemoved.error.kind, "domain");

    db.close();
  });
});
