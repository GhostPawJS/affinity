import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { manageDateAnchorToolHandler } from "./manage_date_anchor_tool.ts";

describe("manage_date_anchor_tool", () => {
  it("adds, revises, and removes a contact date anchor", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: contact } = createContact(db, { name: "Ada", kind: "human" });

    const added = manageDateAnchorToolHandler(db, {
      action: "add",
      input: {
        target: { kind: "contact", contact: { contactId: contact.id } },
        recurrenceKind: "birthday",
        anchorMonth: 12,
        anchorDay: 10,
        summary: "Ada birthday",
        significance: 7,
      },
    });
    strictEqual(added.ok, true);
    if (!added.ok) throw new Error("expected success");

    const revised = manageDateAnchorToolHandler(db, {
      action: "revise",
      anchorEventId: added.data.primary.id,
      patch: { summary: "Ada Birthday" },
    });
    strictEqual(revised.ok, true);

    const removed = manageDateAnchorToolHandler(db, {
      action: "remove",
      anchorEventId: added.data.primary.id,
    });
    strictEqual(removed.ok, true);
    db.close();
  });
});
