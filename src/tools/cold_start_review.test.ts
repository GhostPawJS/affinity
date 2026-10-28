import assert from "node:assert/strict";
import { test } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { getContactProfile } from "../contacts/get_contact_profile.ts";
import { recordCommitment } from "../events/record_commitment.ts";
import { resolveCommitment } from "../events/resolve_commitment.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { listRadar } from "../links/list_radar.ts";
import { refreshLinkRollup } from "../links/rollups.ts";
import { mergeContacts } from "../merges/merge_contacts.ts";
import { inspectAffinityItemToolHandler } from "./inspect_affinity_item_tool.ts";
import { manageContactToolHandler } from "./manage_contact_tool.ts";
import { reviewAffinityToolHandler } from "./review_affinity_tool.ts";

test("profiles and reviews retain names, ISO times, overdue commitments and structural ties", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const owner = createContact(db, {
      name: "Owner",
      kind: "human",
      bootstrapOwner: true,
    }).primary;
    const jana = createContact(db, {
      name: "Jana Petersen",
      kind: "human",
    }).primary;
    const company = createContact(db, {
      name: "Nordlicht",
      kind: "company",
    }).primary;
    const now = Date.now();
    const event = recordCommitment(db, {
      commitmentType: "promise",
      summary: "Send proposal",
      occurredAt: now - 100 * 86400000,
      dueAt: now - 86400000,
      significance: 5,
      participants: [
        { contactId: owner.id, role: "actor" },
        { contactId: jana.id, role: "recipient" },
      ],
      now,
    }).primary;
    db.prepare(
      "INSERT INTO links (from_contact_id,to_contact_id,kind,role,is_structural,created_at,updated_at) VALUES (?,?,'works_at','lead',1,1,1)",
    ).run(jana.id, company.id);
    const profile = getContactProfile(db, jana.id, {
      recentEventsLimit: 1,
      now,
    });
    assert.equal(profile?.recentEvents?.length, 1);
    assert.equal(
      profile?.recentEvents?.[0]?.occurredAtIso,
      new Date(now - 100 * 86400000).toISOString(),
    );
    assert.equal(profile?.openCommitments?.[0]?.overdue, true);
    assert.equal(profile?.ties?.[0]?.name, "Nordlicht");
    const review = reviewAffinityToolHandler(db, { view: "commitments.open" });
    assert.ok(review.ok);
    assert.equal(review.data.items[0]?.overdue, true);
    assert.ok(
      JSON.stringify(review.data.items[0]?.participants).includes(
        "Jana Petersen",
      ),
    );
    assert.ok(!review.data.items[0]?.snippet?.includes(String(now - 86400000)));
    const before = listRadar(db, undefined, { now })[0];
    assert.ok(before?.reasons?.includes("overdue_commitment"));
    const radar = reviewAffinityToolHandler(db, { view: "links.radar" });
    assert.ok(radar.ok);
    assert.equal(radar.data.items[0]?.title, "Jana Petersen");
    assert.ok(before);
    refreshLinkRollup(db, before.linkId, now);
    const recency = listRadar(db, undefined, { now })[0]?.recencyScore;
    resolveCommitment(db, event.id, "broken", { now });
    assert.equal(listRadar(db, undefined, { now })[0]?.recencyScore, recency);
    const loser = createContact(db, {
      name: "Old Jana",
      kind: "human",
    }).primary;
    mergeContacts(db, { winnerContactId: jana.id, loserContactId: loser.id });
    const inspected = inspectAffinityItemToolHandler(db, {
      kind: "contact_profile",
      contact: { contactId: loser.id },
    });
    assert.ok(inspected.ok && inspected.data.kind === "contact_profile");
    assert.deepEqual(inspected.data.detail.mergedInto, {
      id: jana.id,
      name: jana.name,
    });
    assert.ok(inspected.warnings?.[0]?.message.includes("Jana Petersen"));
    const write = manageContactToolHandler(db, {
      action: "revise",
      contact: { contactId: loser.id },
      patch: { name: "Wrong" },
    });
    assert.equal(write.outcome, "error");
    if (write.outcome === "error")
      assert.ok(write.error.message.includes(`use contactId ${jana.id}`));
  } finally {
    db.close();
  }
});

test("overdue ordering uses injected now and cancelled resolutions preserve recency", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const owner = createContact(db, {
      name: "Owner",
      kind: "human",
      bootstrapOwner: true,
    }).primary;
    const contact = createContact(db, {
      name: "Contact",
      kind: "human",
    }).primary;
    const now = new Date(1970, 6, 20, 12).getTime();
    const participants = [
      { contactId: owner.id, role: "actor" as const },
      { contactId: contact.id, role: "recipient" as const },
    ];
    const ids = [null, now + 86400000, now - 86400000, now].map(
      (dueAt) =>
        recordCommitment(db, {
          commitmentType: "promise",
          summary: "Task",
          occurredAt: 1,
          significance: 5,
          dueAt,
          participants,
          now,
        }).primary.id,
    );
    const review = reviewAffinityToolHandler(db, {
      view: "commitments.open",
      now,
    });
    assert.ok(review.ok);
    assert.deepEqual(
      review.data.items.map((item) => item.id),
      [ids[2], ids[3], ids[1], ids[0]],
    );
    assert.deepEqual(
      review.data.items.map((item) => item.overdue),
      [true, false, false, false],
    );
    const before = listRadar(db, undefined, { now })[0];
    assert.ok(before);
    assert.ok(ids[2]);
    resolveCommitment(db, ids[2], "cancelled", {
      now,
      resolvingEvent: {
        type: "promise",
        occurredAt: now,
        summary: "Cancelled task",
        significance: 5,
        participants,
      },
    });
    assert.equal(
      listRadar(db, undefined, { now })[0]?.recencyScore,
      before.recencyScore,
    );
    db.prepare(
      "UPDATE links SET from_contact_id = ?, to_contact_id = ? WHERE id = ?",
    ).run(contact.id, owner.id, before.linkId);
    // A reverse-direction owner link still carries the overdue counterparty obligation.
    assert.ok(ids[1]);
    db.prepare(
      "UPDATE open_commitments SET due_at = ?, due_on = NULL WHERE event_id = ?",
    ).run(now - 1, ids[1]);
    assert.ok(
      listRadar(db, undefined, { now })[0]?.reasons?.includes(
        "overdue_commitment",
      ),
    );
  } finally {
    db.close();
  }
});
