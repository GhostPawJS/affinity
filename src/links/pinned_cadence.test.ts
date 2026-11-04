import assert from "node:assert/strict";
import { test } from "node:test";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import * as read from "../read.ts";
import { humanResult, plainJson } from "../surfaces/cli_output.ts";
import { manageRelationshipToolHandler } from "../tools/manage_relationship_tool.ts";
import * as write from "../write.ts";

test("cadence pins survive evidence and replay, and unpin restores derivation", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const owner = write.createContact(db, {
      name: "Owner",
      kind: "human",
      bootstrapOwner: true,
    }).primary;
    const agent = write.createContact(db, {
      name: "Worker",
      kind: "agent",
    }).primary;
    const link = write.seedSocialLink(db, {
      fromContactId: owner.id,
      toContactId: agent.id,
      kind: "professional",
      cadenceDays: 2.5,
    }).primary;
    assert.equal(link.cadencePinned, true);
    assert.match(
      humanResult({ data: { primary: link } }),
      /cadence 2.5 days · cadencePinned: true/,
    );
    const compact = plainJson({ data: { primary: link } }, true) as {
      data: { primary: { cadenceDays: number; cadencePinned: boolean } };
    };
    assert.equal(compact.data.primary.cadenceDays, 2.5);
    assert.equal(compact.data.primary.cadencePinned, true);
    const day = 86400000;
    const events = [1, 11, 21].map(
      (dayNumber) =>
        write.recordInteraction(db, {
          type: "conversation",
          occurredAt: dayNumber * day,
          now: 30 * day,
          summary: "Review",
          significance: 4,
          participants: [
            { contactId: owner.id, role: "actor" },
            { contactId: agent.id, role: "recipient" },
          ],
        }).primary,
    );
    assert.equal(read.getLinkDetail(db, link.id)?.link.cadenceDays, 2.5);
    assert.ok(events[0]);
    write.reviseEvent(db, { eventId: events[0].id }, { summary: "Revised" });
    assert.equal(read.getLinkDetail(db, link.id)?.link.cadenceDays, 2.5);
    assert.equal(
      read.getContactProfile(db, agent.id)?.topLinks[0]?.cadencePinned,
      true,
    );
    const radar = read.listRadar(db, undefined, { now: 30 * day });
    assert.ok(JSON.stringify(radar).includes("2.5"));
    const result = manageRelationshipToolHandler(db, {
      action: "revise",
      link: { linkId: link.id },
      patch: { cadenceDays: null },
    });
    assert.equal(result.ok, true, JSON.stringify(result));
    const derived = read.getLinkDetail(db, link.id)?.link;
    assert.equal(derived?.cadencePinned, false);
    assert.ok(derived?.cadenceDays != null && derived.cadenceDays !== 2.5);
    assert.equal(
      write.reviseSocialLink(db, link.id, { cadenceDays: 7 }).primary
        .cadenceDays,
      7,
    );
    assert.equal(
      write.reviseSocialLink(db, link.id, { cadenceDays: 7 }).updated.length,
      0,
    );
    for (const cadenceDays of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.throws(
        () => write.reviseSocialLink(db, link.id, { cadenceDays }),
        /positive number/,
      );
      assert.throws(
        () =>
          write.seedSocialLink(db, {
            fromContactId: owner.id,
            toContactId: write.createContact(db, {
              name: "Other",
              kind: "agent",
            }).primary.id,
            kind: "professional",
            cadenceDays,
          }),
        /positive number/,
      );
    }
    const updated = write.reviseSocialLink(db, link.id, {
      rank: 2,
      trust: 0.8,
      affinity: 0.3,
      bond: " coaching ",
      state: "dormant",
    }).primary;
    assert.equal(updated.rank, 2);
    assert.equal(updated.trust, 0.8);
    assert.equal(updated.bond, "coaching");
    assert.equal(updated.state, "dormant");
    assert.throws(() => write.reviseSocialLink(db, link.id, { trust: 2 }));
    assert.throws(
      () => write.reviseSocialLink(db, link.id, { unknown: 2 } as never),
      /unknown/,
    );
  } finally {
    db.close();
  }
});

test("legacy cadence stays derived after migration; unpin without evidence uses the baseline", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const a = write.createContact(db, { name: "A", kind: "human" }).primary;
    const b = write.createContact(db, { name: "B", kind: "agent" }).primary;
    const link = write.seedSocialLink(db, {
      fromContactId: a.id,
      toContactId: b.id,
      kind: "professional",
      cadenceDays: 12,
    }).primary;
    db.exec("ALTER TABLE links DROP COLUMN pinned_cadence_days");
    const { initLinksTables } = await import("./init_links_tables.ts");
    initLinksTables(db);
    initLinksTables(db);
    assert.equal(read.getLinkDetail(db, link.id)?.link.cadenceDays, 12);
    assert.equal(read.getLinkDetail(db, link.id)?.link.cadencePinned, false);
    write.reviseSocialLink(db, link.id, {
      cadenceDays: 3,
      rank: 4,
      trust: 0.8,
    });
    const unpinned = write.reviseSocialLink(db, link.id, {
      cadenceDays: null,
    }).primary;
    assert.equal(unpinned.cadencePinned, false);
    assert.ok((unpinned.cadenceDays ?? 0) > 0);
    assert.equal(unpinned.rank, 4);
    assert.equal(unpinned.trust, 0.8);
  } finally {
    db.close();
  }
});
