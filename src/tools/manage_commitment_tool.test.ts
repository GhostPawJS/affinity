import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { manageCommitmentToolHandler } from "./manage_commitment_tool.ts";

describe("manage_commitment_tool", () => {
  it("records and resolves a commitment", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: other } = createContact(db, { name: "Ada", kind: "human" });

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
});
