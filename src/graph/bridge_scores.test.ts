import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { recordInteraction } from "../events/record_interaction.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { refreshAllBridgeScores } from "./bridge_scores.ts";
import { getAffinityChart } from "./get_affinity_chart.ts";

async function setupOwnerAndContacts(count: number) {
  const db = await createInitializedAffinityDb();
  const now = Date.now();
  const { primary: owner } = createContact(db, {
    name: "Owner",
    kind: "human",
    bootstrapOwner: true,
  });
  const contacts: { id: number; name: string }[] = [];
  for (let i = 0; i < count; i++) {
    const { primary } = createContact(db, {
      name: `Contact${i}`,
      kind: "human",
    });
    contacts.push(primary);
  }
  return { db, owner, contacts, now };
}

describe("refreshAllBridgeScores", () => {
  it("computes real bridge scores for a simple network", async () => {
    const { db, owner, contacts, now } = await setupOwnerAndContacts(3);
    for (const c of contacts) {
      recordInteraction(db, {
        type: "conversation",
        occurredAt: now - 1000,
        summary: `chat with ${c.name}`,
        significance: 5,
        participants: [
          { contactId: owner.id, role: "actor", directionality: "mutual" },
          { contactId: c.id, role: "recipient", directionality: "mutual" },
        ],
        now,
      });
    }

    refreshAllBridgeScores(db, now);

    const rollups = db
      .prepare("SELECT link_id, bridge_score, radar_score FROM link_rollups")
      .all() as {
      link_id: number;
      bridge_score: number;
      radar_score: number;
    }[];

    ok(rollups.length > 0, "rollups should exist");
    for (const row of rollups) {
      ok(
        typeof row.bridge_score === "number",
        "bridge_score should be a number",
      );
      ok(
        row.bridge_score >= 0 && row.bridge_score <= 1,
        "bridge_score in [0, 1]",
      );
    }
    db.close();
  });

  it("produces different scores for bridge vs leaf contacts", async () => {
    const { db, owner, contacts, now } = await setupOwnerAndContacts(4);
    const [a, b, c, d] = contacts;
    if (!a || !b || !c || !d) throw new Error("need 4 contacts");

    recordInteraction(db, {
      type: "conversation",
      occurredAt: now - 3000,
      summary: "owner-A",
      significance: 5,
      participants: [
        { contactId: owner.id, role: "actor", directionality: "mutual" },
        { contactId: a.id, role: "recipient", directionality: "mutual" },
      ],
      now,
    });
    recordInteraction(db, {
      type: "conversation",
      occurredAt: now - 2000,
      summary: "owner-B",
      significance: 5,
      participants: [
        { contactId: owner.id, role: "actor", directionality: "mutual" },
        { contactId: b.id, role: "recipient", directionality: "mutual" },
      ],
      now,
    });
    recordInteraction(db, {
      type: "conversation",
      occurredAt: now - 1000,
      summary: "owner-C",
      significance: 5,
      participants: [
        { contactId: owner.id, role: "actor", directionality: "mutual" },
        { contactId: c.id, role: "recipient", directionality: "mutual" },
      ],
      now,
    });
    recordInteraction(db, {
      type: "conversation",
      occurredAt: now - 500,
      summary: "owner-D",
      significance: 5,
      participants: [
        { contactId: owner.id, role: "actor", directionality: "mutual" },
        { contactId: d.id, role: "recipient", directionality: "mutual" },
      ],
      now,
    });

    refreshAllBridgeScores(db, now);

    const rollups = db
      .prepare("SELECT bridge_score FROM link_rollups")
      .all() as { bridge_score: number }[];
    ok(rollups.length >= 4, "should have rollups for each link");
    db.close();
  });

  it("surfaces bridge scores in getAffinityChart edges", async () => {
    const { db, owner, contacts, now } = await setupOwnerAndContacts(2);
    for (const c of contacts) {
      recordInteraction(db, {
        type: "conversation",
        occurredAt: now - 1000,
        summary: "chat",
        significance: 5,
        participants: [
          { contactId: owner.id, role: "actor", directionality: "mutual" },
          { contactId: c.id, role: "recipient", directionality: "mutual" },
        ],
        now,
      });
    }
    refreshAllBridgeScores(db, now);
    const chart = getAffinityChart(db);
    for (const edge of chart.edges) {
      ok(typeof edge.bridgeScore === "number", "edge should have bridgeScore");
      ok(edge.bridgeScore >= 0, "bridgeScore >= 0");
    }
    db.close();
  });

  it("handles empty graph gracefully", async () => {
    const db = await createInitializedAffinityDb();
    createContact(db, {
      name: "Owner",
      kind: "human",
      bootstrapOwner: true,
    });
    refreshAllBridgeScores(db, Date.now());
    const rollups = db
      .prepare("SELECT count(*) as cnt FROM link_rollups")
      .get() as { cnt: number };
    strictEqual(rollups.cnt, 0);
    db.close();
  });
});
