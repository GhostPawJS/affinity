import assert from "node:assert/strict";
import { test } from "node:test";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import * as write from "../write.ts";
import { deleteContact } from "./delete_contact.ts";

test("permanent erase removes dependent rows, preserves shared events and other link rollups", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const now = Date.now();
    const owner = write.createContact(db, {
      name: "Owner",
      kind: "human",
      bootstrapOwner: true,
    }).primary;
    const jana = write.createContact(db, {
      name: "Jana",
      kind: "human",
    }).primary;
    const sam = write.createContact(db, { name: "Sam", kind: "human" }).primary;
    write.addIdentity(db, jana.id, {
      type: "email",
      value: "jana@example.com",
    });
    write.setAttribute(
      db,
      { kind: "contact", id: jana.id },
      "tag:friend",
      null,
    );
    const privateEvent = write.recordInteraction(db, {
      type: "conversation",
      occurredAt: now,
      summary: "Private",
      significance: 5,
      participants: [
        { contactId: owner.id, role: "actor" },
        { contactId: jana.id, role: "recipient" },
      ],
    }).primary;
    const sharedEvent = write.recordInteraction(db, {
      type: "conversation",
      occurredAt: now,
      summary: "Shared",
      significance: 5,
      participants: [
        { contactId: owner.id, role: "actor" },
        { contactId: jana.id, role: "recipient" },
        { contactId: sam.id, role: "recipient" },
      ],
    }).primary;
    write.recordCommitment(db, {
      commitmentType: "promise",
      occurredAt: now,
      summary: "Private promise",
      significance: 6,
      participants: [
        { contactId: owner.id, role: "actor" },
        { contactId: jana.id, role: "recipient" },
      ],
    });
    const tie = write.setStructuralTie(db, {
      fromContactId: jana.id,
      toContactId: sam.id,
      kind: "works_at",
    }).primary;
    write.setAttribute(db, { kind: "link", id: tie.id }, "note", "private");
    write.addDateAnchor(db, {
      target: { kind: "contact", contactId: jana.id },
      recurrenceKind: "birthday",
      anchorMonth: 11,
      anchorDay: 3,
      summary: "Birthday",
      significance: 4,
    });
    write.addDateAnchor(db, {
      target: { kind: "link", linkId: tie.id },
      recurrenceKind: "anniversary",
      anchorMonth: 11,
      anchorDay: 3,
      summary: "Anniversary",
      significance: 4,
    });
    const otherLink = db
      .prepare(
        "SELECT id FROM links WHERE from_contact_id = ? AND to_contact_id = ? AND is_structural = 0",
      )
      .get(owner.id, sam.id);
    assert.ok(otherLink);
    const before = db
      .prepare(
        "SELECT total_meaningful_events, last_event_id FROM link_rollups WHERE link_id = ?",
      )
      .get(otherLink.id);
    const count = db.prepare("SELECT COUNT(*) AS n FROM events").get()?.n;
    assert.throws(
      () => deleteContact(db, jana.id, {}),
      /delete is permanent; pass confirm: true/,
    );
    assert.equal(
      db.prepare("SELECT COUNT(*) AS n FROM events").get()?.n,
      count,
    );
    assert.throws(
      () => deleteContact(db, owner.id, { confirm: true }),
      /owner contact cannot be deleted/,
    );
    const result = deleteContact(db, jana.id, { confirm: true });
    assert.ok(
      result.removed.some(
        (row) => row.entity === "contacts" && row.ids.includes(jana.id),
      ),
    );
    assert.ok(
      result.removed.some(
        (row) => row.entity === "events" && row.ids.includes(privateEvent.id),
      ),
    );
    assert.equal(
      db.prepare("SELECT id FROM contacts WHERE id = ?").get(jana.id),
      undefined,
    );
    assert.equal(
      db.prepare("SELECT id FROM events WHERE id = ?").get(privateEvent.id),
      undefined,
    );
    assert.ok(
      db.prepare("SELECT id FROM events WHERE id = ?").get(sharedEvent.id),
    );
    assert.equal(
      db
        .prepare(
          "SELECT COUNT(*) AS n FROM event_participants WHERE event_id = ?",
        )
        .get(sharedEvent.id)?.n,
      2,
    );
    for (const table of ["identities", "attributes", "event_participants"])
      assert.equal(
        db
          .prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE contact_id = ?`)
          .get(jana.id)?.n,
        0,
      );
    assert.equal(
      db
        .prepare("SELECT COUNT(*) AS n FROM events WHERE type = 'date_anchor'")
        .get()?.n,
      0,
    );
    assert.equal(
      db.prepare("SELECT COUNT(*) AS n FROM open_commitments").get()?.n,
      0,
    );
    assert.deepEqual(
      db
        .prepare(
          "SELECT total_meaningful_events, last_event_id FROM link_rollups WHERE link_id = ?",
        )
        .get(otherLink.id),
      before,
    );
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    db.close();
  }
});

test("erasing a merge winner clears lineage references without dangling foreign keys", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const winner = write.createContact(db, {
      name: "Jana",
      kind: "human",
    }).primary;
    const loser = write.createContact(db, {
      name: "Jana",
      kind: "human",
    }).primary;
    write.mergeContacts(db, {
      winnerContactId: winner.id,
      loserContactId: loser.id,
    });
    deleteContact(db, winner.id, { confirm: true });
    assert.equal(
      db
        .prepare("SELECT merged_into_contact_id FROM contacts WHERE id = ?")
        .get(loser.id)?.merged_into_contact_id,
      null,
    );
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
    assert.throws(() => deleteContact(db, winner.id, { confirm: true }), {
      code: "NOT_FOUND",
    });
  } finally {
    db.close();
  }
});
