import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { inspectAffinityItemToolHandler } from "../tools/inspect_affinity_item_tool.ts";
import { manageContactToolHandler } from "../tools/manage_contact_tool.ts";
import { manageIdentityToolHandler } from "../tools/manage_identity_tool.ts";
import { manageRelationshipToolHandler } from "../tools/manage_relationship_tool.ts";
import {
  createSkillTestDb,
  expectError,
  expectSuccess,
} from "./skill_test_utils.ts";

describe("import_history_without_faking_evidence skill scenario", () => {
  it("seeds an honest historical baseline and rejects duplicate re-seeding", async () => {
    const db = await createSkillTestDb();

    const alex = expectSuccess(
      manageContactToolHandler(db, {
        action: "create",
        input: { name: "Alex Founder", kind: "human" },
      }),
    );
    const maya = expectSuccess(
      manageContactToolHandler(db, {
        action: "create",
        input: { name: "Maya Client", kind: "human" },
      }),
    );

    expectSuccess(
      manageIdentityToolHandler(db, {
        action: "add",
        contact: { contactId: alex.data.primary.id },
        input: { type: "email", value: "alex@example.com" },
      }),
    );
    expectSuccess(
      manageIdentityToolHandler(db, {
        action: "add",
        contact: { contactId: maya.data.primary.id },
        input: { type: "email", value: "maya@example.com" },
      }),
    );

    const seeded = expectSuccess(
      manageRelationshipToolHandler(db, {
        action: "seed_social_link",
        from: { contactId: alex.data.primary.id },
        to: { contactId: maya.data.primary.id },
        input: {
          kind: "professional",
          rank: 4,
          trust: 0.8,
          cadenceDays: 30,
          bond: "Longstanding client relationship from before Affinity",
        },
      }),
    );

    const link = expectSuccess(
      inspectAffinityItemToolHandler(db, {
        kind: "link",
        link: { linkId: seeded.data.primary.id },
      }),
    );
    if (link.data.kind !== "link") {
      throw new Error("expected link detail");
    }
    strictEqual(link.data.detail.link.kind, "professional");
    strictEqual(link.data.detail.link.rank, 4);

    const duplicateSeed = expectError(
      manageRelationshipToolHandler(db, {
        action: "seed_social_link",
        from: { contactId: alex.data.primary.id },
        to: { contactId: maya.data.primary.id },
        input: { kind: "professional" },
      }),
    );
    strictEqual(duplicateSeed.error.kind, "domain");

    db.close();
  });
});
