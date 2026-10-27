import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { recordInteraction } from "../events/record_interaction.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { getLinkDetail } from "./get_link_detail.ts";
import { getLinkTimeline } from "./get_link_timeline.ts";
import { listOwnerSocialLinks } from "./list_owner_social_links.ts";
import { listProgressionReadiness } from "./list_progression_readiness.ts";
import { listRadar } from "./list_radar.ts";
import { refreshLinkRollup } from "./rollups.ts";
import { seedSocialLink } from "./seed_social_link.ts";

it("handles absent owners, counterparties, rollups and missing links", async () => {
  const db = await createInitializedAffinityDb();
  try {
    deepStrictEqual(listRadar(db), []);
    deepStrictEqual(listOwnerSocialLinks(db), []);
    deepStrictEqual(listProgressionReadiness(db), []);
    strictEqual(getLinkDetail(db, 999), null);
    deepStrictEqual(getLinkTimeline(db, 999), []);
    const a = createContact(db, { name: "A", kind: "human" }).primary;
    const b = createContact(db, { name: "B", kind: "human" }).primary;
    const link = seedSocialLink(db, {
      fromContactId: a.id,
      toContactId: b.id,
      kind: "personal",
    }).primary;
    strictEqual(getLinkDetail(db, link.id)?.counterparty.id, b.id);
    db.prepare("UPDATE contacts SET is_owner = 1 WHERE id = ?").run(b.id);
    strictEqual(
      getLinkDetail(db, link.id, { recentEventsLimit: 1 })?.counterparty.id,
      a.id,
    );
    db.prepare("UPDATE contacts SET is_owner = 0 WHERE id = ?").run(b.id);
    createContact(db, { name: "Owner", kind: "human", bootstrapOwner: true });
    strictEqual(getLinkDetail(db, link.id)?.counterparty.id, b.id);
    db.prepare("DELETE FROM link_rollups WHERE link_id = ?").run(link.id);
    strictEqual(getLinkDetail(db, link.id)?.rollups, null);
    db.prepare("UPDATE contacts SET deleted_at = 1 WHERE id = ?").run(b.id);
    strictEqual(getLinkDetail(db, link.id), null);
  } finally {
    db.close();
  }
});

it("filters owner links and uses a generic snippet only when there are no reasons", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const owner = createContact(db, {
      name: "Owner",
      kind: "human",
      bootstrapOwner: true,
    }).primary;
    const other = createContact(db, { name: "Other", kind: "human" }).primary;
    const link = seedSocialLink(db, {
      fromContactId: owner.id,
      toContactId: other.id,
      kind: "personal",
    }).primary;
    refreshLinkRollup(db, link.id, 100);
    for (const [drift, recency, rank] of [
      [0.6, 1, 0],
      [0.3, 1, 0],
      [0, 0.2, 0.4],
      [0, 0.4, 0.6],
      [0, 1, 0],
    ] as const) {
      db.prepare(
        "UPDATE link_rollups SET drift_priority=?,recency_score=?,normalized_rank=? WHERE link_id=?",
      ).run(drift, recency, rank, link.id);
      strictEqual(
        listRadar(db)[0]?.recommendedReason,
        "Routine check-in recommended",
      );
      deepStrictEqual(listRadar(db)[0]?.reasons, []);
    }
    for (const state of ["active", "dormant", "archived"]) {
      db.prepare("UPDATE links SET state=? WHERE id=?").run(state, link.id);
      const options = {
        includeArchived: true,
        includeDormant: true,
        includeObserved: false,
      };
      strictEqual(
        listRadar(db, { kind: "personal", state: state as "active" }, options)
          .length,
        1,
      );
      strictEqual(
        listOwnerSocialLinks(
          db,
          { kind: "personal", state: state as "active" },
          options,
        ).length,
        1,
      );
      strictEqual(listRadar(db, { kind: "professional" }, options).length, 0);
      strictEqual(
        listOwnerSocialLinks(db, { kind: "professional" }, options).length,
        0,
      );
      strictEqual(listRadar(db).length, state === "active" ? 1 : 0);
    }
    db.prepare("UPDATE links SET state='active' WHERE id=?").run(link.id);
    strictEqual(listProgressionReadiness(db, { kind: "personal" }).length, 1);
    strictEqual(
      listProgressionReadiness(db, { kind: "professional" }).length,
      0,
    );
    db.prepare("DELETE FROM link_rollups WHERE link_id=?").run(link.id);
    strictEqual(listRadar(db)[0]?.driftPriority, 0);
    strictEqual(listRadar(db)[0]?.recencyScore, 0);
    strictEqual(listRadar(db)[0]?.normalizedRank, 0);
  } finally {
    db.close();
  }
});

it("bounds timeline dates inclusively and filters event types and pages", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const owner = createContact(db, {
      name: "Owner",
      kind: "human",
      bootstrapOwner: true,
    }).primary;
    const other = createContact(db, { name: "Other", kind: "human" }).primary;
    const ids = [];
    let linkId = 0;
    for (const occurredAt of [10, 20, 30]) {
      const receipt = recordInteraction(db, {
        type: "conversation",
        occurredAt,
        summary: "hello",
        significance: 5,
        participants: [
          { contactId: owner.id, role: "actor", directionality: "mutual" },
          { contactId: other.id, role: "recipient", directionality: "mutual" },
        ],
      });
      ids.push(receipt.primary.id);
      linkId = receipt.affectedLinks[0] as number;
    }
    deepStrictEqual(
      getLinkTimeline(db, linkId, {
        since: 20,
        until: 30,
        eventTypes: ["conversation"],
      }).map((e) => e.id),
      [ids[2], ids[1]],
    );
    deepStrictEqual(getLinkTimeline(db, linkId, { eventTypes: ["gift"] }), []);
    deepStrictEqual(
      getLinkTimeline(db, linkId, { eventTypes: [], limit: 1, offset: 1 }).map(
        (e) => e.id,
      ),
      [ids[1]],
    );
  } finally {
    db.close();
  }
});
