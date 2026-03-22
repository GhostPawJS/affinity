import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitializedAffinityDb } from "../lib/test-db.ts";
import { createContact } from "./create_contact.ts";
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
