import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import {
  manageRelationshipTool,
  manageRelationshipToolHandler,
} from "./manage_relationship_tool.ts";

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

  it("rejects an invalid social link kind", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });

    const result = manageRelationshipToolHandler(db, {
      action: "seed_social_link",
      from: { contactId: a.id },
      to: { contactId: b.id },
      kind: "friend",
    });
    strictEqual(result.ok, false);
    db.close();
  });

  it("accepts valid relational link kinds via top-level kind", async () => {
    const db = await createInitializedAffinityDb();
    const kinds = ["personal", "family", "professional", "romantic"];
    for (const kind of kinds) {
      const { primary: a } = createContact(db, {
        name: `A-${kind}`,
        kind: "human",
      });
      const { primary: b } = createContact(db, {
        name: `B-${kind}`,
        kind: "human",
      });
      const result = manageRelationshipToolHandler(db, {
        action: "seed_social_link",
        from: { contactId: a.id },
        to: { contactId: b.id },
        kind,
      });
      strictEqual(result.ok, true, `kind "${kind}" should succeed`);
    }
    db.close();
  });

  it("rejects an invalid structural tie kind", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "company" });

    const result = manageRelationshipToolHandler(db, {
      action: "set_structural_tie",
      from: { contactId: a.id },
      to: { contactId: b.id },
      kind: "coworker",
    });
    strictEqual(result.ok, false);
    db.close();
  });

  it("accepts valid structural tie kind via top-level kind", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "company" });

    const result = manageRelationshipToolHandler(db, {
      action: "set_structural_tie",
      from: { contactId: a.id },
      to: { contactId: b.id },
      kind: "works_at",
      role: "engineer",
    });
    strictEqual(result.ok, true);
    db.close();
  });

  it("schema kind description lists valid values", () => {
    const props = manageRelationshipTool.inputSchema.properties;
    strictEqual(props?.kind?.description?.includes("personal"), true);
    strictEqual(props?.kind?.description?.includes("works_at"), true);
    strictEqual(props?.kind?.description?.includes("other_structural"), true);
  });
});
