import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import {
  type ManageCommitmentToolInput,
  manageCommitmentTool,
  manageCommitmentToolHandler,
} from "./manage_commitment_tool.ts";

describe("manage_commitment_tool", () => {
  it("records and resolves a commitment", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: other } = createContact(db, {
      name: "Ada",
      kind: "human",
    });

    const recorded = manageCommitmentToolHandler(db, {
      action: "record",
      input: {
        commitmentType: "promise",
        occurredAt: 10,
        summary: "send recap",
        significance: 5,
        participants: [
          { contactId: owner.id, role: "actor" },
          { contactId: other.id, role: "recipient" },
        ],
      },
    });
    strictEqual(recorded.ok, true);
    if (!recorded.ok) throw new Error("expected success");

    const resolved = manageCommitmentToolHandler(db, {
      action: "resolve",
      commitmentEventId: recorded.data.primary.id,
      resolution: "kept",
    });
    strictEqual(resolved.ok, true);
    db.close();
  });

  it("auto-injects owner into commitment participants when missing", async () => {
    const db = await createInitializedAffinityDb();
    createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: other } = createContact(db, {
      name: "Ada",
      kind: "human",
    });

    const recorded = manageCommitmentToolHandler(db, {
      action: "record",
      input: {
        commitmentType: "agreement",
        occurredAt: 20,
        summary: "owner auto-injected",
        significance: 4,
        participants: [{ contactId: other.id, role: "recipient" }],
      },
    });
    strictEqual(recorded.ok, true);
    db.close();
  });

  it("accepts locator-style participants with nested contact object", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: other } = createContact(db, {
      name: "Ada",
      kind: "human",
    });

    const recorded = manageCommitmentToolHandler(db, {
      action: "record",
      input: {
        commitmentType: "promise",
        occurredAt: 30,
        summary: "locator-style test",
        significance: 3,
        participants: [
          { contact: { contactId: owner.id }, role: "actor" },
          { contact: { contactId: other.id }, role: "recipient" },
        ],
      },
    } as unknown as ManageCommitmentToolInput);
    strictEqual(recorded.ok, true);
    if (recorded.ok) {
      strictEqual(recorded.data.primary.summary, "locator-style test");
    }
    db.close();
  });

  it("input schema declares full commitment properties", () => {
    const inputProps = manageCommitmentTool.inputSchema.properties?.input;
    strictEqual(inputProps?.type, "object");
    strictEqual(inputProps?.properties?.commitmentType?.type, "string");
    strictEqual(
      Array.isArray(inputProps?.properties?.commitmentType?.enum),
      true,
    );
    strictEqual(inputProps?.properties?.occurredAt?.type, "integer");
    strictEqual(inputProps?.properties?.summary?.type, "string");
    strictEqual(inputProps?.properties?.significance?.type, "integer");
    strictEqual(inputProps?.properties?.participants?.type, "array");
  });
});
