import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { addIdentity } from "../identities/add_identity.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { seedSocialLink } from "../links/seed_social_link.ts";
import { inspectAffinityItemToolHandler } from "./inspect_affinity_item_tool.ts";

describe("inspect_affinity_item_tool", () => {
  it("loads a contact profile via identity locator", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: contact } = createContact(db, {
      name: "Ada",
      kind: "human",
    });
    addIdentity(db, contact.id, {
      type: "email",
      value: "ada@example.com",
    });

    const result = inspectAffinityItemToolHandler(db, {
      kind: "contact_profile",
      contact: {
        identity: { type: "email", value: "ada@example.com" },
      },
    });

    strictEqual(result.ok, true);
    if (result.ok && result.data.kind === "contact_profile") {
      strictEqual(result.data.detail.contact.name, "Ada");
    }
    db.close();
  });

  it("loads link detail via exact link id", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: other } = createContact(db, { name: "B", kind: "human" });
    const receipt = seedSocialLink(db, {
      fromContactId: owner.id,
      toContactId: other.id,
      kind: "personal",
    });

    const result = inspectAffinityItemToolHandler(db, {
      kind: "link",
      link: { linkId: receipt.primary.id },
    });

    strictEqual(result.ok, true);
    if (result.ok && result.data.kind === "link") {
      strictEqual(result.data.detail.counterparty.name, "B");
    }
    db.close();
  });
});
