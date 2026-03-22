import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { recordMilestone } from "./record_milestone.ts";

describe("recordMilestone", () => {
  it("sets moment_kind milestone", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: other } = createContact(db, { name: "A", kind: "human" });
    const r = recordMilestone(db, {
      occurredAt: 1,
      summary: "promotion",
      significance: 8,
      participants: [
        { contactId: owner.id, role: "actor" },
        { contactId: other.id, role: "recipient" },
      ],
    });
    strictEqual(r.primary.type, "milestone");
    strictEqual(r.primary.momentKind, "milestone");
    db.close();
  });
});
