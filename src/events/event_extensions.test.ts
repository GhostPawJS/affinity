import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { initAffinityTables } from "../init_affinity_tables.ts";
import type { RecordInteractionInput } from "../lib/types/record_interaction_input.ts";
import { refreshLinkRollup } from "../links/rollups.ts";
import * as read from "../read.ts";
import { inspectAffinityItemToolHandler } from "../tools/inspect_affinity_item_tool.ts";
import { manageAttributeToolHandler } from "../tools/manage_attribute_tool.ts";
import { manageCommitmentToolHandler } from "../tools/manage_commitment_tool.ts";
import { manageEventToolHandler } from "../tools/manage_event_tool.ts";
import { recordEventToolHandler } from "../tools/record_event_tool.ts";
import { reviewAffinityToolHandler } from "../tools/review_affinity_tool.ts";
import { searchAffinityToolHandler } from "../tools/search_affinity_tool.ts";
import * as write from "../write.ts";

const now = Date.UTC(2026, 9, 27, 12);
function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  initAffinityTables(db);
  createContact(db, { name: "Owner", kind: "human", bootstrapOwner: true });
  createContact(db, { name: "Sam", kind: "human" });
  return db;
}
function evidence(
  extra: Partial<RecordInteractionInput> = {},
): RecordInteractionInput {
  return {
    type: "conversation",
    occurredAt: now - 86_400_000,
    summary: "Hello",
    significance: 4,
    participants: [
      { contactId: 1, role: "actor" },
      { contactId: 2, role: "recipient", directionality: "mutual" },
    ],
    now,
    ...extra,
  };
}
test("external references are normalized and deduplicate all event families and commitments without effects", () => {
  const db = fixture();
  try {
    const first = write.recordInteraction(
      db,
      evidence({ externalRef: { source: " Bluesky ", id: " at://one " } }),
    );
    const repeat = write.recordCommitment(db, {
      ...evidence(),
      commitmentType: "promise",
      externalRef: { source: "BLUESKY", id: "at://one" },
    });
    assert.equal(repeat.primary.id, first.primary.id);
    assert.equal(repeat.outcome, "no_op");
    for (const key of [
      "created",
      "updated",
      "removed",
      "affectedLinks",
      "derivedEffects",
    ] as const)
      assert.deepEqual(repeat[key], []);
    const result = recordEventToolHandler(db, {
      kind: "interaction",
      input: evidence({ externalRef: { source: "bluesky", id: "at://one" } }),
    });
    assert.equal(result.outcome, "no_op");
    assert.match(result.summary, /already recorded/);
    assert.equal(
      read.getEventByExternalRef(db, " BLUESKY ", "at://one")?.id,
      first.primary.id,
    );
    assert.equal(read.getEventByExternalRef(db, "bluesky", "missing"), null);
    const inspected = inspectAffinityItemToolHandler(db, {
      kind: "event",
      ref: { source: "bluesky", id: "at://one" },
    });
    assert.equal(inspected.ok, true);
    assert.equal(
      (db.prepare("SELECT count(*) n FROM events").get() as { n: number }).n,
      1,
    );
    assert.throws(
      () =>
        write.recordObservation(db, {
          ...evidence(),
          externalRef: { source: " ", id: "x" },
        }),
      /non-empty/,
    );
    assert.throws(
      () =>
        db
          .prepare(
            "INSERT INTO events(type,occurred_at,summary,created_at,updated_at,external_source,external_id) VALUES ('observation',1,'x',1,1,'bluesky','at://one')",
          )
          .run(),
      /UNIQUE/,
    );
  } finally {
    db.close();
  }
});
test("strict intake rejects unknown keys and unknown momentKind with allowed values", () => {
  const db = fixture();
  try {
    for (const key of ["externalId", "source", "unexpected"]) {
      const result = recordEventToolHandler(db, {
        kind: "interaction",
        input: { ...evidence(), [key]: "bad" },
      });
      assert.equal(result.ok, false);
      if (!result.ok && "error" in result)
        assert.match(
          result.error.message,
          /allowed keys:.*content.*externalRef/s,
        );
    }
    const badMoment = recordEventToolHandler(db, {
      kind: "observation",
      input: { ...evidence(), momentKind: "follow" } as never,
    });
    assert.equal(badMoment.ok, false);
    if (!badMoment.ok && "error" in badMoment)
      assert.match(badMoment.error.message, /breakthrough.*turning_point/);
    const badCommitment = manageCommitmentToolHandler(db, {
      action: "record",
      input: {
        ...evidence(),
        commitmentType: "promise",
        externalId: "bad",
      } as never,
    });
    assert.equal(badCommitment.ok, false);
    assert.throws(
      () =>
        write.recordInteraction(
          db,
          evidence({ momentKind: "follow" as never }),
        ),
      /momentKind must be one of/,
    );
    const good = write.recordInteraction(
      db,
      evidence({ momentKind: "milestone" }),
    );
    assert.equal(good.primary.momentKind, "milestone");
  } finally {
    db.close();
  }
});
test("content is verbatim, bounded, summarized and returned once only when requested", () => {
  const db = fixture();
  try {
    const content = " \r\n\t👩🏽‍💻  für\tSam\u0000\r\nlast line  \n";
    const { summary: _summary, ...input } = evidence();
    const event = write.recordInteraction(db, { ...input, content }).primary;
    assert.equal(event.content, content);
    write.setAttribute(
      db,
      { kind: "event", eventId: event.id },
      "cid",
      "retained",
    );
    const exported = read
      .exportContact(db, 2)
      .events.find((row) => row.id === event.id);
    assert.equal(exported?.content, content);
    assert.equal(
      (exported?.attributes as { value: string }[])[0]?.value,
      "retained",
    );
    assert.equal(
      read.exportAffinity(db).events.find((row) => row.id === event.id)
        ?.content,
      content,
    );
    assert.equal(event.summary, "👩🏽‍💻 für Sam\u0000");
    const empty = write.recordInteraction(db, {
      ...input,
      content: "",
    }).primary;
    assert.equal(empty.summary, "(no text)");
    assert.equal(empty.content, "");
    const large = "a".repeat(1_048_576);
    const big = write.recordInteraction(db, {
      ...input,
      content: large,
    }).primary;
    assert.equal(big.summary.length, 140);
    assert.equal(
      read.getContactJournal(db, 2).find((e) => e.id === big.id)?.content,
      undefined,
    );
    const compact = reviewAffinityToolHandler(db, {
      view: "events.contact_journal",
      contact: { contactId: 2 },
    });
    const full = reviewAffinityToolHandler(db, {
      view: "events.contact_journal",
      contact: { contactId: 2 },
      includeContent: true,
    });
    assert.ok(JSON.stringify(compact).length < 3000);
    const serialized = JSON.stringify(full);
    assert.ok(serialized.length > large.length);
    assert.ok(serialized.length < large.length + 6000);
    const explicit = write.recordInteraction(db, {
      ...input,
      summary: "Label",
      content,
    }).primary;
    assert.equal(explicit.summary, "Label");
    assert.throws(
      () =>
        write.recordInteraction(db, {
          ...input,
          content: "a".repeat(4_000_000),
        }),
      /at most 1 MB/,
    );
    assert.throws(
      () =>
        write.recordInteraction(db, { ...input, content: "é".repeat(524289) }),
      /at most 1 MB/,
    );
  } finally {
    db.close();
  }
});
test("event search matches folded content, references and channel while contact search remains default", () => {
  const db = fixture();
  try {
    const event = write.recordInteraction(
      db,
      evidence({
        content: "Für den Tipp",
        externalRef: { source: "bluesky", id: "at://one" },
        channel: " Bluesky ",
      }),
    ).primary;
    for (const query of ["FUER Tipp", "at://one", "bluesky"]) {
      const result = searchAffinityToolHandler(db, { query, scope: "events" });
      assert.ok(result.ok);
      if (result.ok) {
        assert.equal(result.data?.items[0]?.id, event.id);
        assert.equal(result.data?.items[0]?.kind, "event");
      }
    }
    const contacts = searchAffinityToolHandler(db, { query: "Hello" });
    assert.ok(contacts.ok);
    if (contacts.ok) assert.equal(contacts.data?.items[0]?.kind, "contact");
  } finally {
    db.close();
  }
});
test("event attributes, channel filtering and unresolved parent references survive late parent intake", () => {
  const db = fixture();
  try {
    const child = write.recordInteraction(
      db,
      evidence({
        channel: " Bluesky ",
        externalRef: { source: "bluesky", id: "child" },
        parentRef: { source: "Bluesky", id: "root" },
        threadRef: { source: "bluesky", id: "root" },
      }),
    ).primary;
    write.setAttribute(db, { kind: "event", eventId: child.id }, "cid", "one");
    assert.equal(
      read.getEventById(db, child.id)?.attributes?.[0]?.value,
      "one",
    );
    write.replaceAttributes(db, { kind: "event", eventId: child.id }, [
      { name: "cid", value: "two" },
    ]);
    assert.equal(
      read.getEventById(db, child.id)?.attributes?.[0]?.value,
      "two",
    );
    write.unsetAttribute(db, { kind: "event", eventId: child.id }, "cid");
    assert.equal(read.getEventById(db, child.id)?.attributes, undefined);
    const root = write.recordInteraction(
      db,
      evidence({
        occurredAt: now - 2 * 86_400_000,
        channel: "email",
        externalRef: { source: "bluesky", id: "root" },
      }),
    ).primary;
    assert.equal(
      read.getContactJournal(db, 2, { channel: "bluesky" })[0]?.parentEventId,
      root.id,
    );
    assert.equal(read.getContactJournal(db, 2, { channel: "phone" }).length, 0);
    const grandchild = write.recordInteraction(
      db,
      evidence({ occurredAt: now, parentEventId: child.id }),
    ).primary;
    assert.deepEqual(
      read.getEventThread(db, "bluesky", "root").map((e) => e.id),
      [root.id, child.id, grandchild.id],
    );
    const reviewed = reviewAffinityToolHandler(db, {
      view: "events.thread",
      ref: { source: "bluesky", id: "root" },
    });
    assert.ok(reviewed.ok);
    if (reviewed.ok) assert.equal(reviewed.data?.count, 3);
    assert.throws(
      () => write.recordInteraction(db, evidence({ channel: "x".repeat(41) })),
      /40/,
    );
  } finally {
    db.close();
  }
});
function linkState(db: DatabaseSync) {
  return db
    .prepare(
      "SELECT rank,affinity,trust,state,cadence_days FROM links WHERE id=1",
    )
    .get();
}
function rollup(db: DatabaseSync) {
  return db
    .prepare(
      "SELECT total_meaningful_events,positive_meaningful_events,last_meaningful_event_at,outbound_count,inbound_count,recency_score FROM link_rollups WHERE link_id=1",
    )
    .get();
}
test("revise and delete replay dependent effects to match fresh evidence", () => {
  const db = fixture();
  const fresh = fixture();
  try {
    const one = write.recordInteraction(
      db,
      evidence({
        significance: 8,
        externalRef: { source: "bluesky", id: "first" },
      }),
    ).primary;
    const two = write.recordInteraction(
      db,
      evidence({ significance: 6, occurredAt: now - 86_000_000 }),
    ).primary;
    write.setAttribute(db, { kind: "event", eventId: one.id }, "cid", "one");
    assert.throws(
      () => write.deleteEvent(db, one.id, { confirm: false }),
      /confirm/,
    );
    assert.throws(
      () => write.reviseEvent(db, two.id, { unknown: 1 } as never),
      /allowed keys/,
    );
    assert.throws(
      () => write.reviseEvent(db, two.id, { type: "transaction" }),
      /same event kind/,
    );
    assert.throws(
      () =>
        write.reviseEvent(db, one.id, {
          externalRef: { source: "x", id: "y" },
        }),
      /only be set/,
    );
    write.reviseEvent(db, two.id, {
      summary: "Corrected",
      content: "  exact  ",
      significance: 3,
      channel: " EMAIL ",
      externalRef: { source: " X ", id: " two " },
    });
    assert.equal(read.getEventById(db, two.id)?.channel, "email");
    write.deleteEvent(
      db,
      { ref: { source: "bluesky", id: "first" } },
      { confirm: true },
    );
    write.recordInteraction(
      fresh,
      evidence({
        summary: "Corrected",
        content: "  exact  ",
        significance: 3,
        occurredAt: now - 86_000_000,
        channel: "email",
        externalRef: { source: "x", id: "two" },
      }),
    );
    assert.deepEqual(linkState(db), linkState(fresh));
    // Match rollups at a fixed as-of time; the deletion itself uses the actual clock.
    refreshLinkRollup(db, 1, now);
    refreshLinkRollup(fresh, 1, now);
    assert.deepEqual(rollup(db), rollup(fresh));
    assert.equal(read.getEventById(db, one.id), null);
    for (const table of [
      "event_participants",
      "attributes",
      "link_event_effects",
    ])
      assert.equal(
        (
          db
            .prepare(`SELECT count(*) n FROM ${table} WHERE event_id=?`)
            .get(one.id) as { n: number }
        ).n,
        0,
      );
    const invalid = manageEventToolHandler(db, {
      action: "revise",
      eventId: two.id,
      patch: { bad: true } as never,
    });
    assert.equal(invalid.ok, false);
  } finally {
    db.close();
    fresh.close();
  }
});
test("0.5 schema upgrades retain events and attributes and initialize new metadata in place", () => {
  const db = fixture();
  try {
    const event = write.recordInteraction(db, evidence()).primary;
    write.setAttribute(db, { kind: "contact", id: 2 }, "note", "keep");
    db.exec(`DROP INDEX idx_events_external_ref;
 DROP TABLE event_link_baselines;
 CREATE TABLE legacy_attributes (
 id INTEGER PRIMARY KEY AUTOINCREMENT, contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
 link_id INTEGER REFERENCES links(id) ON DELETE CASCADE,name TEXT NOT NULL,value TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,deleted_at INTEGER,
 CHECK(length(trim(name))>0),CHECK((contact_id IS NOT NULL AND link_id IS NULL) OR (contact_id IS NULL AND link_id IS NOT NULL)));
 INSERT INTO legacy_attributes SELECT id,contact_id,link_id,name,value,created_at,updated_at,deleted_at FROM attributes;
 DROP TABLE attributes; ALTER TABLE legacy_attributes RENAME TO attributes;`);
    for (const column of [
      "content",
      "declared_moment_kind",
      "external_source",
      "external_id",
      "channel",
      "parent_source",
      "parent_ref_id",
      "parent_event_id",
      "thread_source",
      "thread_id",
      "provenance_json",
    ])
      db.exec(`ALTER TABLE events DROP COLUMN ${column}`);
    for (const column of ["participant_json", "provenance_json"])
      db.exec(`ALTER TABLE link_event_effects DROP COLUMN ${column}`);
    initAffinityTables(db);
    initAffinityTables(db);
    assert.equal(read.getEventById(db, event.id)?.summary, "Hello");
    assert.equal(
      (
        db.prepare("SELECT value FROM attributes WHERE contact_id=2").get() as {
          value: string;
        }
      ).value,
      "keep",
    );
    write.setAttribute(db, { kind: "event", eventId: event.id }, "cid", "new");
    write.reviseEvent(db, event.id, {
      content: " upgraded ",
      externalRef: { source: "bluesky", id: "legacy" },
    });
    assert.equal(
      read.getEventByExternalRef(db, "bluesky", "legacy")?.content,
      " upgraded ",
    );
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
    assert.ok(
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE name='idx_attributes_contact'",
        )
        .get(),
    );
    assert.throws(
      () =>
        write.setAttribute(db, { kind: "contact", id: 2 }, "bad", 42 as never),
      /strings or null/,
    );
  } finally {
    db.close();
  }
});
test("replay preserves explicit moments and state overrides at their intake positions", () => {
  const db = fixture();
  const fresh = fixture();
  try {
    const first = write.recordInteraction(
      db,
      evidence({ significance: 8, momentKind: "turning_point" }),
    );
    write.overrideLinkState(db, first.affectedLinks[0] as number, "dormant", {
      now,
    });
    const second = write.recordInteraction(
      db,
      evidence({
        significance: 3,
        occurredAt: now - 86_000_000,
        momentKind: "milestone",
      }),
    );
    write.overrideLinkState(db, 1, "archived", { now });
    write.seedSocialLink(fresh, {
      fromContactId: 1,
      toContactId: 2,
      kind: "personal",
      now,
    });
    write.overrideLinkState(fresh, 1, "dormant", { now });
    write.recordInteraction(
      fresh,
      evidence({
        significance: 3,
        occurredAt: now - 86_000_000,
        momentKind: "milestone",
      }),
    );
    write.overrideLinkState(fresh, 1, "archived", { now });
    write.deleteEvent(db, first.primary.id, { confirm: true });
    assert.deepEqual(linkState(db), linkState(fresh));
    assert.equal(
      read.getEventById(db, second.primary.id)?.momentKind,
      "milestone",
    );
    assert.throws(
      () => read.searchEvents(db, "Hello", { offset: -1 }),
      /non-negative/,
    );
  } finally {
    db.close();
    fresh.close();
  }
});
test("four megabytes of journal content appear once while default rows stay small", () => {
  const db = fixture();
  try {
    const content = "x".repeat(1_048_576);
    for (let i = 0; i < 4; i++)
      write.recordInteraction(db, evidence({ content }));
    const input = {
      view: "events.contact_journal" as const,
      contact: { contactId: 2 },
    };
    const compact = JSON.stringify(reviewAffinityToolHandler(db, input));
    const full = JSON.stringify(
      reviewAffinityToolHandler(db, { ...input, includeContent: true }),
    );
    assert.ok(compact.length < 8000);
    assert.ok(full.length >= 4 * content.length);
    assert.ok(full.length < 4 * content.length + 8000);
  } finally {
    db.close();
  }
});

test("retest: provenance, external attribute targets, thread filtering, export parents and larger pages", () => {
  const db = fixture();
  try {
    const root = write.recordInteraction(
      db,
      evidence({
        externalRef: { source: "bsky", id: "root" },
        provenance: { origin: "archive" },
      }),
    ).primary;
    const child = write.recordInteraction(
      db,
      evidence({
        type: "activity",
        externalRef: { source: "bsky", id: "child" },
        parentRef: { source: "bsky", id: "root" },
      }),
    ).primary;
    const inspected = inspectAffinityItemToolHandler(db, {
      kind: "event",
      eventId: root.id,
    });
    assert.ok(inspected.ok && inspected.data.kind === "event");
    assert.deepEqual(inspected.data.detail.provenance, { origin: "archive" });
    const target = {
      kind: "event" as const,
      ref: { source: " BSKY ", id: "child" },
    };
    const first = manageAttributeToolHandler(db, {
      action: "set",
      target,
      name: "k",
      value: "v",
    });
    assert.equal(first.outcome, "success");
    const updatedAt = db
      .prepare("SELECT updated_at FROM attributes WHERE event_id=?")
      .get(child.id)?.updated_at;
    const repeat = manageAttributeToolHandler(db, {
      action: "set",
      target,
      name: "k",
      value: "v",
    });
    assert.equal(repeat.outcome, "no_op");
    assert.ok(repeat.ok);
    assert.deepEqual(repeat.data.changes, []);
    assert.equal(
      db
        .prepare("SELECT updated_at FROM attributes WHERE event_id=?")
        .get(child.id)?.updated_at,
      updatedAt,
    );
    assert.equal(
      manageAttributeToolHandler(db, {
        action: "set",
        target: { kind: "event", ref: { source: "bsky", id: "missing" } },
        name: "k",
        value: "v",
      }).outcome,
      "error",
    );
    const thread = reviewAffinityToolHandler(db, {
      view: "events.thread",
      ref: { source: "bsky", id: "root" },
      eventTypes: ["conversation"],
      limit: 500,
    });
    assert.ok(thread.ok);
    assert.deepEqual(
      thread.data.items.map((x) => x.id),
      [root.id],
    );
    const filteredChild = reviewAffinityToolHandler(db, {
      view: "events.thread",
      ref: { source: "bsky", id: "root" },
      eventTypes: ["activity"],
      limit: 1,
    });
    assert.ok(filteredChild.ok);
    assert.equal(filteredChild.data.total, 1);
    assert.deepEqual(
      filteredChild.data.items.map((item) => item.id),
      [child.id],
    );
    const exported = read.exportContact(db, 2);
    assert.equal(
      exported.events.find((e) => e.id === child.id)?.parentEventId,
      root.id,
    );
    for (let i = 0; i < 251; i++) write.recordInteraction(db, evidence());
    const page = reviewAffinityToolHandler(db, {
      view: "events.contact_journal",
      contact: { contactId: 2 },
      limit: 500,
    });
    assert.ok(page.ok);
    assert.equal(page.data.count, 253);
    const next = reviewAffinityToolHandler(db, {
      view: "events.contact_journal",
      contact: { contactId: 2 },
      limit: 500,
      offset: 250,
    });
    assert.ok(next.ok);
    assert.equal(next.data.count, 3);
    assert.equal(next.data.hasMore, false);
    const invalid = reviewAffinityToolHandler(db, {
      view: "events.contact_journal",
      contact: { contactId: 2 },
      limit: 10001,
    });
    assert.ok(!invalid.ok && invalid.outcome === "error");
    assert.match(invalid.error.message, /10000.*offset/);
  } finally {
    db.close();
  }
});

test("like and follow labels default to ambient effects across event families, with explicit opt-in", () => {
  const db = fixture();
  try {
    for (const summary of ["Liked a post", "Followed Sam", "repost: a post"]) {
      const receipt = write.recordInteraction(
        db,
        evidence({ type: "activity", summary }),
      );
      assert.equal(receipt.primary.affectsBond, false);
      assert.deepEqual(receipt.derivedEffects, []);
      assert.deepEqual(receipt.affectedLinks, []);
    }
    const milestone = write.recordMilestone(
      db,
      evidence({ summary: "Follow Sam" }),
    );
    assert.equal(milestone.primary.affectsBond, false);
    assert.deepEqual(milestone.derivedEffects, []);
    const explicit = write.recordInteraction(
      db,
      evidence({ summary: "Like Sam", affectsBond: true }),
    );
    assert.equal(explicit.primary.affectsBond, true);
    assert.ok(explicit.derivedEffects.length > 0);
  } finally {
    db.close();
  }
});

test("high precision direct tool intake preserves raw timestamp and caller provenance", () => {
  const db = fixture();
  try {
    const occurredAt = "2026-10-27T11:00:00.869560Z";
    const result = recordEventToolHandler(db, {
      kind: "interaction",
      input: { ...evidence(), occurredAt, provenance: { source: "archive" } },
    });
    assert.ok(result.ok);
    assert.equal(
      result.data.primary.occurredAt,
      Date.parse("2026-10-27T11:00:00.869Z"),
    );
    assert.deepEqual(result.data.primary.provenance, {
      source: "archive",
      rawOccurredAt: occurredAt,
    });
    assert.deepEqual(
      read.getEventById(db, result.data.primary.id)?.provenance,
      result.data.primary.provenance,
    );
  } finally {
    db.close();
  }
});

test("duplicate review defaults to 0.5 and explicit minScore still exposes weak candidates", () => {
  const db = fixture();
  try {
    createContact(db, { name: "Sam Other", kind: "human" });
    createContact(db, { name: "Alex Other", kind: "human" });
    createContact(db, { name: "Sam", kind: "human" });
    const all = reviewAffinityToolHandler(db, {
      view: "contacts.duplicates",
      minScore: 0,
    });
    const defaults = reviewAffinityToolHandler(db, {
      view: "contacts.duplicates",
    });
    assert.ok(all.ok && defaults.ok);
    assert.ok(all.data.items.length > defaults.data.items.length);
    assert.ok(defaults.data.items.length > 0);
    assert.ok(
      defaults.data.items.every(
        (item) => Number(item.matchScore ?? item.score) >= 0.5,
      ),
    );
  } finally {
    db.close();
  }
});
