import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { recordEventToolHandler } from "./record_event_tool.ts";

describe("record_event_tool", () => {
  it("records an interaction event", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: other } = createContact(db, { name: "Ada", kind: "human" });

    const result = recordEventToolHandler(db, {
      kind: "interaction",
      input: {
        type: "conversation",
        occurredAt: 10,
        summary: "coffee",
        significance: 5,
        participants: [
          { contactId: owner.id, role: "actor", directionality: "mutual" },
          { contactId: other.id, role: "recipient", directionality: "mutual" },
        ],
      },
    });

    strictEqual(result.ok, true);
    if (result.ok) {
      strictEqual(result.data.primary.summary, "coffee");
    }
    db.close();
  });
});
