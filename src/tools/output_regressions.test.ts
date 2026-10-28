import assert from "node:assert/strict";
import { test } from "node:test";
import { getContactProfile } from "../contacts/get_contact_profile.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { plainJson } from "../surfaces/cli_output.ts";
import * as write from "../write.ts";
import { manageAttributeToolHandler } from "./manage_attribute_tool.ts";
import { manageContactToolHandler } from "./manage_contact_tool.ts";
import { reviewAffinityToolHandler } from "./review_affinity_tool.ts";

test("journal, dates and radar avoid repeated context; profiles exclude date anchors", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const owner = write.createContact(db, {
      name: "Owner",
      kind: "human",
      bootstrapOwner: true,
    }).primary;
    const jana = write.createContact(db, {
      name: "Jana",
      kind: "human",
    }).primary;
    const event = write.recordInteraction(db, {
      type: "conversation",
      summary: "Call",
      significance: 5,
      occurredAt: Date.now(),
      participants: [
        { contactId: owner.id, role: "actor" },
        { contactId: jana.id, role: "recipient" },
      ],
    }).primary;
    const profile = getContactProfile(db, jana.id);
    assert.equal(profile?.topLinks[0]?.counterpartyName, "Owner");
    const linkId = profile?.topLinks[0]?.id;
    assert.ok(linkId);
    const day = new Date();
    write.addDateAnchor(db, {
      target: { kind: "link", linkId },
      recurrenceKind: "anniversary",
      anchorMonth: day.getUTCMonth() + 1,
      anchorDay: day.getUTCDate(),
      summary: "Anniversary",
      significance: 4,
    });
    assert.deepEqual(
      getContactProfile(db, jana.id, {
        recentEventsLimit: 1,
      })?.recentEvents?.map((e) => e.id),
      [event.id],
    );
    const journal = reviewAffinityToolHandler(db, {
      view: "events.contact_journal",
      contact: { contactId: jana.id },
      eventTypes: ["conversation"],
    });
    assert.ok(journal.ok);
    const row = JSON.parse(JSON.stringify(journal.data.items[0]));
    assert.equal(row.id, event.id);
    for (const key of ["eventId", "title", "subtitle", "counterpartyNames"])
      assert.equal(key in row, false);
    assert.deepEqual(row.participants, [
      { id: owner.id, name: "Owner", role: "actor" },
      { id: jana.id, name: "Jana", role: "recipient" },
    ]);
    assert.equal(row.summary, "Call");
    assert.ok(row.occurredOn && row.occurredAtIso && row.occurredAt);
    const dates = reviewAffinityToolHandler(db, {
      view: "dates.upcoming",
      horizonDays: 366,
    });
    assert.ok(dates.ok);
    const date = JSON.parse(JSON.stringify(dates.data.items[0]));
    assert.equal(date.id, linkId);
    assert.equal(date.title, "Jana");
    for (const key of [
      "radarScore",
      "trust",
      "driftPriority",
      "recencyScore",
      "targetRef",
    ])
      assert.equal(key in date, false);
    const radar = reviewAffinityToolHandler(db, { view: "links.radar" });
    assert.ok(radar.ok);
    assert.equal(radar.data.items[0]?.linkId, undefined);
    for (const state of ["dormant", "lost"] as const) {
      write.setContactLifecycle(db, jana.id, state);
      const hidden = reviewAffinityToolHandler(db, { view: "links.radar" });
      assert.ok(hidden.ok);
      assert.equal(hidden.data.items.length, 0);
      const shown = reviewAffinityToolHandler(db, {
        view: "links.radar",
        includeDormant: true,
        includeLost: true,
      });
      assert.ok(shown.ok);
      assert.equal(shown.data.items.length, 1);
    }
    db.prepare(
      "UPDATE contacts SET lifecycle_state = 'merged', merged_into_contact_id = ? WHERE id = ?",
    ).run(owner.id, jana.id);
    const merged = reviewAffinityToolHandler(db, {
      view: "links.radar",
      includeDormant: true,
      includeLost: true,
    });
    assert.ok(merged.ok);
    assert.equal(merged.data.items.length, 0);
  } finally {
    db.close();
  }
});

test("compact mutations retain ids and warnings; attribute numbers and booleans explain text storage", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const receipt = manageContactToolHandler(db, {
      action: "create",
      input: { name: "Sam", kind: "human" },
    });
    assert.ok(receipt.ok);
    const compact = JSON.parse(JSON.stringify(plainJson(receipt, true)));
    assert.deepEqual(compact.data.primary, { id: receipt.data.primary.id });
    assert.equal(compact.entities, undefined);
    assert.equal(compact.data.created, undefined);
    assert.deepEqual(compact.data.changes, [
      { entity: "contact", id: receipt.data.primary.id, action: "created" },
    ]);
    const warning = { code: "possible_duplicate", message: "Review Sam" };
    assert.deepEqual(
      (
        plainJson({ ...receipt, warnings: [warning] }, true) as {
          warnings: unknown;
        }
      ).warnings,
      [warning],
    );
    assert.equal(compact.data.primary.name, undefined);
    assert.ok(receipt.data.primary.name);
    for (const value of [300, true]) {
      const result = manageAttributeToolHandler(db, {
        action: "set",
        target: {
          kind: "contact",
          contact: { contactId: receipt.data.primary.id },
        },
        name: "capacity",
        value,
      } as never);
      assert.equal(result.outcome, "error");
      if (result.outcome === "error")
        assert.equal(
          result.error.message,
          `attribute values are strings or null; pass "${value}" to store it as text`,
        );
    }
  } finally {
    db.close();
  }
});
