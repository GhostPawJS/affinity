import assert from "node:assert/strict";
import { test } from "node:test";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { manageContactToolHandler } from "../tools/manage_contact_tool.ts";
import * as write from "../write.ts";
import { migrateContactKind } from "./migrate_contact_kind.ts";

test("kind revisions preserve connected records and audit only actual changes", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const owner = write.createContact(db, {
      name: "Owner",
      kind: "human",
      bootstrapOwner: true,
    }).primary;
    const contact = write.createContact(db, {
      name: "Desk",
      kind: "service",
    }).primary;
    write.addIdentity(db, contact.id, {
      type: "email",
      value: "desk@example.com",
    });
    write.seedSocialLink(db, {
      fromContactId: owner.id,
      toContactId: contact.id,
      kind: "professional",
    });
    write.recordObservation(db, {
      occurredAt: 1,
      summary: "Imported observation",
      significance: 1,
      participants: [{ contactId: contact.id, role: "subject" }],
    });
    const before = ["identities", "links", "events", "event_participants"].map(
      (table) => db.prepare(`SELECT * FROM ${table} ORDER BY id`).all(),
    );
    const receipt = migrateContactKind(db, contact.id, "agent");
    assert.equal(receipt.primary.id, contact.id);
    assert.equal(receipt.primary.kind, "agent");
    assert.equal(receipt.created.length, 1);
    assert.deepEqual(
      db.prepare("SELECT * FROM identities ORDER BY id").all(),
      before[0],
    );
    assert.deepEqual(
      db.prepare("SELECT * FROM links ORDER BY id").all(),
      before[1],
    );
    assert.deepEqual(
      db.prepare("SELECT * FROM events ORDER BY id").all().slice(0, -1),
      before[2],
    );
    assert.deepEqual(
      db
        .prepare("SELECT * FROM event_participants ORDER BY id")
        .all()
        .slice(0, -1),
      before[3],
    );
    const audit = db
      .prepare(
        "SELECT type, affects_bond, provenance_json FROM events WHERE id=?",
      )
      .get<{ type: string; affects_bond: number; provenance_json: string }>(
        receipt.created[0]?.id ?? 0,
      );
    assert.ok(audit);
    assert.equal(audit.type, "correction");
    assert.equal(audit.affects_bond, 0);
    assert.deepEqual(JSON.parse(audit.provenance_json), {
      action: "migrate_contact_kind",
      from: "service",
      to: "agent",
    });
    assert.equal(migrateContactKind(db, contact.id, "agent").updated.length, 0);
    assert.equal(
      db.prepare("SELECT COUNT(*) AS n FROM events").get<{ n: number }>()?.n,
      2,
    );
    assert.throws(
      () => migrateContactKind(db, owner.id, "company"),
      /owner.*human or agent/,
    );
    assert.equal(
      migrateContactKind(db, owner.id, "agent").primary.kind,
      "agent",
    );
    const revised = manageContactToolHandler(db, {
      action: "migrate_kind",
      contact: { contactId: contact.id },
      kind: "company",
    });
    assert.equal(revised.ok, true);
    assert.throws(
      () => migrateContactKind(db, contact.id, "invalid" as "agent"),
      /invalid contact kind/,
    );
    assert.throws(
      () => migrateContactKind(db, 999999, "agent"),
      /contact not found/,
    );
    db.exec(
      "CREATE TRIGGER fail_kind_audit BEFORE INSERT ON events BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END",
    );
    assert.throws(
      () => migrateContactKind(db, contact.id, "human"),
      /audit unavailable/,
    );
    assert.equal(
      db
        .prepare("SELECT kind FROM contacts WHERE id=?")
        .get<{ kind: string }>(contact.id)?.kind,
      "company",
    );
    db.exec("DROP TRIGGER fail_kind_audit");
    const eventCount = db
      .prepare("SELECT COUNT(*) AS n FROM events")
      .get<{ n: number }>()?.n;
    db.prepare("UPDATE contacts SET lifecycle_state='merged' WHERE id=?").run(
      contact.id,
    );
    assert.throws(
      () => migrateContactKind(db, contact.id, "human"),
      /merged contact/,
    );
    assert.equal(
      db.prepare("SELECT COUNT(*) AS n FROM events").get<{ n: number }>()?.n,
      eventCount,
    );
  } finally {
    db.close();
  }
});
