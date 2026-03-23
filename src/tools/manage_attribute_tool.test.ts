import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { manageAttributeToolHandler } from "./manage_attribute_tool.ts";

describe("manage_attribute_tool", () => {
  it("sets, replaces, and unsets contact attributes", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: contact } = createContact(db, {
      name: "Ada",
      kind: "human",
    });

    const set = manageAttributeToolHandler(db, {
      action: "set",
      target: { kind: "contact", contact: { contactId: contact.id } },
      name: "nickname",
      value: "Ace",
    });
    strictEqual(set.ok, true);

    const replaced = manageAttributeToolHandler(db, {
      action: "replace",
      target: { kind: "contact", contact: { contactId: contact.id } },
      entries: [{ name: "tag", value: "friend" }],
    });
    strictEqual(replaced.ok, true);

    const unset = manageAttributeToolHandler(db, {
      action: "unset",
      target: { kind: "contact", contact: { contactId: contact.id } },
      name: "tag",
    });
    strictEqual(unset.ok, true);
    db.close();
  });
});
