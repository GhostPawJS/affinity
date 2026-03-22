import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { recordInteraction } from "../events/record_interaction.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { listOwnerSocialLinks } from "./list_owner_social_links.ts";

describe("listOwnerSocialLinks", () => {
  it("orders by normalized rank then trust", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    recordInteraction(db, {
      type: "conversation",
      occurredAt: 10,
      summary: "hello",
      significance: 9,
      participants: [
        { contactId: owner.id, role: "actor", directionality: "mutual" },
        { contactId: a.id, role: "recipient", directionality: "mutual" },
      ],
    });
    recordInteraction(db, {
      type: "conversation",
      occurredAt: 11,
      summary: "quick hi",
      significance: 3,
      participants: [
        {
          contactId: owner.id,
          role: "actor",
          directionality: "owner_initiated",
        },
        {
          contactId: b.id,
          role: "recipient",
          directionality: "other_initiated",
        },
      ],
    });
    const rows = listOwnerSocialLinks(db);
    strictEqual(rows.length, 2);
    strictEqual(rows[0]?.toContactId, a.id);
    strictEqual(rows[1]?.toContactId, b.id);
    db.close();
  });
});
