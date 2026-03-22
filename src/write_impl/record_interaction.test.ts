import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitializedAffinityDb } from "../lib/test-db.ts";
import { createContact } from "./create_contact.ts";
import { recordInteraction } from "./record_interaction.ts";

describe("recordInteraction", () => {
  it("creates event and seeds personal link when missing", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: other } = createContact(db, { name: "A", kind: "human" });
    const r = recordInteraction(db, {
      type: "conversation",
      occurredAt: 10,
      summary: "hello",
      significance: 5,
      participants: [
        { contactId: owner.id, role: "actor" },
        { contactId: other.id, role: "recipient" },
      ],
    });
    strictEqual(r.primary.type, "conversation");
    const evCount = db
      .prepare("SELECT COUNT(*) AS c FROM events")
      .get() as unknown as { c: number };
    strictEqual(Number(evCount.c), 1);
    const linkCount = db
      .prepare("SELECT COUNT(*) AS c FROM links")
      .get() as unknown as { c: number };
    strictEqual(Number(linkCount.c), 1);
    strictEqual(r.affectedLinks.length, 1);
    db.close();
  });
});
