import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { inspectAffinityItemToolHandler } from "./inspect_affinity_item_tool.ts";
import { manageAttributeToolHandler } from "./manage_attribute_tool.ts";
import { manageContactToolHandler } from "./manage_contact_tool.ts";
import { manageIdentityToolHandler } from "./manage_identity_tool.ts";
import { searchAffinityToolHandler } from "./search_affinity_tool.ts";
import { getAffinityToolByName } from "./tool_registry.ts";

describe("tools integration", () => {
  it("can manage a basic contact lifecycle through tools only", async () => {
    const db = await createInitializedAffinityDb();
    const manageContact = getAffinityToolByName("manage_contact");
    const manageIdentity = getAffinityToolByName("manage_identity");
    const search = getAffinityToolByName("search_affinity");
    const inspect = getAffinityToolByName("inspect_affinity_item");
    const manageAttribute = getAffinityToolByName("manage_attribute");

    if (
      !manageContact ||
      !manageIdentity ||
      !search ||
      !inspect ||
      !manageAttribute
    ) {
      throw new Error("expected tool registry entries");
    }

    strictEqual(manageContact.handler, manageContactToolHandler);
    strictEqual(manageIdentity.handler, manageIdentityToolHandler);
    strictEqual(search.handler, searchAffinityToolHandler);
    strictEqual(inspect.handler, inspectAffinityItemToolHandler);
    strictEqual(manageAttribute.handler, manageAttributeToolHandler);

    const created = manageContactToolHandler(db, {
      action: "create",
      input: { name: "Ada", kind: "human" },
    });
    strictEqual(created.ok, true);
    if (!created.ok) throw new Error("expected success");

    const addedIdentity = manageIdentityToolHandler(db, {
      action: "add",
      contact: { contactId: created.data.primary.id },
      input: { type: "email", value: "ada@example.com" },
    });
    strictEqual(addedIdentity.ok, true);

    const found = searchAffinityToolHandler(db, {
      query: "email:ada@example.com",
    });
    strictEqual(found.ok, true);
    if (!found.ok) throw new Error("expected success");
    strictEqual(found.data.items.length, 1);

    const attributed = manageAttributeToolHandler(db, {
      action: "set",
      target: {
        kind: "contact",
        contact: { contactId: created.data.primary.id },
      },
      name: "tag",
      value: "friend",
    });
    strictEqual(attributed.ok, true);

    const detail = inspectAffinityItemToolHandler(db, {
      kind: "contact_profile",
      contact: { contactId: created.data.primary.id },
    });
    strictEqual(detail.ok, true);
    if (detail.ok && detail.data.kind === "contact_profile") {
      strictEqual(detail.data.detail.contact.name, "Ada");
      strictEqual(detail.data.detail.attributes.length, 1);
    }
    db.close();
  });
});
