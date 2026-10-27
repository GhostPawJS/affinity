import { match, strictEqual } from "node:assert/strict";
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

  it("summarizes what changed and explains owner mistakes", async () => {
    const db = await createInitializedAffinityDb();
    const owner = manageContactToolHandler(db, {
      action: "create",
      input: { name: "Max", kind: "human", bootstrapOwner: true },
    });
    strictEqual(owner.ok, true);
    strictEqual(owner.summary, "Created 1 contact.");

    const second = manageContactToolHandler(db, {
      action: "create",
      input: { name: "Max again", kind: "human", bootstrapOwner: true },
    });
    strictEqual(second.ok, false);
    if (second.ok || second.outcome !== "error")
      throw new Error("expected error");
    match(second.error.message, /contact 1 \(Max\).*only be used once/);

    const readOnly = manageContactToolHandler(db, {
      action: "create",
      input: { name: "Sam", kind: "human", isOwner: true } as never,
    });
    strictEqual(readOnly.ok, false);
    if (readOnly.ok || readOnly.outcome !== "error")
      throw new Error("expected error");
    match(readOnly.error.message, /isOwner is read-only; pass bootstrapOwner/);
    db.close();
  });
});
