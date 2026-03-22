import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { addIdentity, createContact, recordInteraction } from "../write.ts";

describe("support table integration", () => {
  it("keeps contact, link, and effect support tables in sync", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: other } = createContact(db, {
      name: "Pat",
      kind: "human",
    });

    let rollup = db
      .prepare("SELECT warning_count FROM contact_rollups WHERE contact_id = ?")
      .get(other.id) as { warning_count: number };
    strictEqual(rollup.warning_count, 1);

    addIdentity(db, other.id, { type: "email", value: "pat@example.com" });
    rollup = db
      .prepare("SELECT warning_count FROM contact_rollups WHERE contact_id = ?")
      .get(other.id) as { warning_count: number };
    strictEqual(rollup.warning_count, 0);

    const now = Date.now();
    const receipt = recordInteraction(db, {
      type: "conversation",
      occurredAt: now - 1000,
      summary: "checked in",
      significance: 7,
      participants: [
        { contactId: owner.id, role: "actor", directionality: "mutual" },
        { contactId: other.id, role: "recipient", directionality: "mutual" },
      ],
      now,
    });

    const linkId = receipt.affectedLinks[0] as number;
    const effectRow = db
      .prepare(
        `SELECT event_id, base_weight, affinity_delta, trust_delta, rank_delta
         FROM link_event_effects
         WHERE link_id = ?`,
      )
      .get(linkId) as {
      event_id: number;
      base_weight: number;
      affinity_delta: number;
      trust_delta: number;
      rank_delta: number;
    };
    strictEqual(effectRow.event_id, receipt.primary.id);
    strictEqual(effectRow.base_weight > 0, true);
    strictEqual(
      effectRow.affinity_delta !== 0 ||
        effectRow.trust_delta !== 0 ||
        effectRow.rank_delta !== 0,
      true,
    );

    const linkRollup = db
      .prepare(
        `SELECT last_event_id, total_meaningful_events
         FROM link_rollups
         WHERE link_id = ?`,
      )
      .get(linkId) as {
      last_event_id: number;
      total_meaningful_events: number;
    };
    strictEqual(linkRollup.last_event_id, receipt.primary.id);
    strictEqual(linkRollup.total_meaningful_events, 1);
    db.close();
  });
});
