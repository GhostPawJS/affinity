import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import {
  manageDateAnchorTool,
  manageDateAnchorToolHandler,
} from "./manage_date_anchor_tool.ts";

describe("manage_date_anchor_tool", () => {
  it("adds, revises, and removes a contact date anchor", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: contact } = createContact(db, {
      name: "Ada",
      kind: "human",
    });

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

  it("input schema declares full date-anchor properties", () => {
    const inputProps = manageDateAnchorTool.inputSchema.properties?.input;
    strictEqual(inputProps?.type, "object");
    strictEqual(inputProps?.properties?.recurrenceKind?.type, "string");
    strictEqual(
      Array.isArray(inputProps?.properties?.recurrenceKind?.enum),
      true,
    );
    strictEqual(inputProps?.properties?.anchorMonth?.type, "integer");
    strictEqual(inputProps?.properties?.anchorDay?.type, "integer");
    strictEqual(inputProps?.properties?.summary?.type, "string");
    strictEqual(inputProps?.properties?.significance?.type, "integer");
    strictEqual(inputProps?.properties?.target?.type, "object");
  });

  it("patch schema declares revisable fields", () => {
    const patchProps = manageDateAnchorTool.inputSchema.properties?.patch;
    strictEqual(patchProps?.type, "object");
    strictEqual(patchProps?.properties?.recurrenceKind?.type, "string");
    strictEqual(patchProps?.properties?.anchorMonth?.type, "integer");
    strictEqual(patchProps?.properties?.summary?.type, "string");
    strictEqual(patchProps?.properties?.significance?.type, "integer");
  });
});
