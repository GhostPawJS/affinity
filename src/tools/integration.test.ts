import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { getAffinityToolByName } from "./tool_registry.ts";

describe("tools integration", () => {
  it("can manage a basic contact lifecycle through tools only", async () => {
    const db = await createInitializedAffinityDb();
    const manageContact = getAffinityToolByName("manage_contact");
    const manageIdentity = getAffinityToolByName("manage_identity");
    const search = getAffinityToolByName("search_affinity");
    const inspect = getAffinityToolByName("inspect_affinity_item");
    const manageAttribute = getAffinityToolByName("manage_attribute");

    if (!manageContact || !manageIdentity || !search || !inspect || !manageAttribute) {
      throw new Error("expected tool registry entries");
    }

    const created = manageContact.handler(db, {
      action: "create",
      input: { name: "Ada", kind: "human" },
    } as never) as any;
    strictEqual(created.ok, true);
    if (!created.ok) throw new Error("expected success");

    const addedIdentity = manageIdentity.handler(db, {
      action: "add",
      contact: { contactId: created.data.primary.id },
      input: { type: "email", value: "ada@example.com" },
    } as never) as any;
    strictEqual(addedIdentity.ok, true);

    const found = search.handler(db, { query: "email:ada@example.com" } as never) as any;
    strictEqual(found.ok, true);
    if (!found.ok) throw new Error("expected success");
    strictEqual(found.data.items.length, 1);

    const attributed = manageAttribute.handler(db, {
      action: "set",
      target: { kind: "contact", contact: { contactId: created.data.primary.id } },
      name: "tag",
      value: "friend",
    } as never) as any;
    strictEqual(attributed.ok, true);

    const detail = inspect.handler(db, {
      kind: "contact_profile",
      contact: { contactId: created.data.primary.id },
    } as never) as any;
    strictEqual(detail.ok, true);
    if (detail.ok) {
      strictEqual(detail.data.detail.contact.name, "Ada");
      strictEqual(detail.data.detail.attributes.length, 1);
    }
    db.close();
  });
});
