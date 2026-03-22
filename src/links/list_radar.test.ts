import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { recordInteraction } from "../events/record_interaction.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { listRadar } from "./list_radar.ts";

describe("listRadar", () => {
  it("orders rows by rollup-backed radar score", async () => {
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
      summary: "older",
      significance: 9,
      participants: [
        { contactId: owner.id, role: "actor", directionality: "mutual" },
        { contactId: a.id, role: "recipient", directionality: "mutual" },
      ],
    });
    recordInteraction(db, {
      type: "conversation",
      occurredAt: 10 + 120 * 86_400_000,
      summary: "recent",
      significance: 3,
      participants: [
        { contactId: owner.id, role: "actor", directionality: "mutual" },
        { contactId: b.id, role: "recipient", directionality: "mutual" },
      ],
    });
    const rows = listRadar(db);
    strictEqual(rows.length, 2);
    strictEqual(rows[0]?.contactId, a.id);
    strictEqual(rows[1]?.contactId, b.id);
    db.close();
  });
});
