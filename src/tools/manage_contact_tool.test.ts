import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { manageContactToolHandler } from "./manage_contact_tool.ts";

describe("manage_contact_tool", () => {
  it("creates, revises, and changes lifecycle for a contact", async () => {
    const db = await createInitializedAffinityDb();

    const created = manageContactToolHandler(db, {
      action: "create",
      input: { name: "Ada", kind: "human" },
    });
    strictEqual(created.ok, true);
    if (!created.ok) throw new Error("expected success");

    const revised = manageContactToolHandler(db, {
      action: "revise",
      contact: { contactId: created.data.primary.id },
      patch: { name: "Ada Lovelace" },
    });
    strictEqual(revised.ok, true);

    const lifecycle = manageContactToolHandler(db, {
      action: "set_lifecycle",
      contact: { contactId: created.data.primary.id },
      lifecycleState: "dormant",
    });
    strictEqual(lifecycle.ok, true);
    if (lifecycle.ok) {
      strictEqual(lifecycle.data.primary.lifecycleState, "dormant");
    }
    db.close();
  });
});
