import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { manageRelationshipToolHandler } from "./manage_relationship_tool.ts";

describe("manage_relationship_tool", () => {
  it("seeds a link and revises its bond", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });

    const seeded = manageRelationshipToolHandler(db, {
      action: "seed_social_link",
      from: { contactId: a.id },
      to: { contactId: b.id },
      input: { kind: "personal" },
    });
    strictEqual(seeded.ok, true);
    if (!seeded.ok) throw new Error("expected success");

    const bonded = manageRelationshipToolHandler(db, {
      action: "revise_bond",
      link: { linkId: seeded.data.primary.id },
      bond: "trusted collaborator",
    });
    strictEqual(bonded.ok, true);
    if (bonded.ok) {
      strictEqual(bonded.data.primary.bond, "trusted collaborator");
    }
    db.close();
  });
});
