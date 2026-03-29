import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import {
  type RecordEventToolInput,
  recordEventTool,
  recordEventToolHandler,
} from "./record_event_tool.ts";

describe("record_event_tool", () => {
  it("records an interaction event", async () => {
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

  it("auto-injects owner into interaction participants when missing", async () => {
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

    const result = recordEventToolHandler(db, {
      kind: "interaction",
      input: {
        type: "conversation",
        occurredAt: 20,
        summary: "owner auto-injected",
        significance: 3,
        participants: [{ contactId: other.id, role: "recipient" }],
      },
    });

    strictEqual(result.ok, true);
    db.close();
  });

  it("does NOT auto-inject owner for observations", async () => {
    const db = await createInitializedAffinityDb();
    createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });

    const result = recordEventToolHandler(db, {
      kind: "observation",
      input: {
        occurredAt: 30,
        summary: "saw A and B together",
        significance: 3,
        participants: [
          { contactId: a.id, role: "observer" },
          { contactId: b.id, role: "subject" },
        ],
      },
    });

    strictEqual(result.ok, true);
    if (result.ok) {
      strictEqual(result.data.affectedLinks.length, 1);
    }
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

    const result = recordEventToolHandler(db, {
      kind: "interaction",
      input: {
        type: "activity",
        occurredAt: 40,
        summary: "locator-style test",
        significance: 4,
        participants: [
          { contact: { contactId: owner.id }, role: "actor" },
          { contact: { contactId: other.id }, role: "recipient" },
        ],
      },
    } as unknown as RecordEventToolInput);

    strictEqual(result.ok, true);
    if (result.ok) {
      strictEqual(result.data.primary.summary, "locator-style test");
    }
    db.close();
  });

  it("input schema declares full participant properties", () => {
    const inputProps = recordEventTool.inputSchema.properties?.input;
    strictEqual(inputProps?.type, "object");
    strictEqual(inputProps?.properties?.occurredAt?.type, "integer");
    strictEqual(inputProps?.properties?.summary?.type, "string");
    strictEqual(inputProps?.properties?.significance?.type, "integer");
    strictEqual(inputProps?.properties?.participants?.type, "array");
    const participantProps =
      inputProps?.properties?.participants?.items?.properties;
    strictEqual(participantProps?.contactId?.type, "integer");
    strictEqual(participantProps?.role?.type, "string");
    strictEqual(Array.isArray(participantProps?.role?.enum), true);
  });
});
