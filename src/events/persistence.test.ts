import { strictEqual } from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { initAffinityTables } from "../init_affinity_tables.ts";
import { insertDateAnchorEvent, insertJournalEvent } from "./persistence.ts";

describe("events persistence", () => {
  it("inserts journal events and participants", () => {
    const db = new DatabaseSync(":memory:");
    initAffinityTables(db);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("A", "human", 1, 1);
    const eventId = insertJournalEvent(db, {
      type: "conversation",
      occurredAt: 1,
      summary: "hello",
      significance: 5,
      momentKind: null,
      participants: [{ contactId: 1, role: "actor" }],
    });
    strictEqual(eventId, 1);
    const count = db
      .prepare(
        "SELECT COUNT(*) AS c FROM event_participants WHERE event_id = ?",
      )
      .get(eventId) as { c?: number };
    strictEqual(Number(count.c ?? 0), 1);
    db.close();
  });

  it("inserts date anchors with anchor metadata", () => {
    const db = new DatabaseSync(":memory:");
    initAffinityTables(db);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("A", "human", 1, 1);
    const eventId = insertDateAnchorEvent(db, {
      occurredAt: 1,
      summary: "birthday",
      significance: 5,
      recurrenceKind: "birthday",
      anchorMonth: 3,
      anchorDay: 15,
      anchorContactId: 1,
      anchorLinkId: null,
      participants: [{ contactId: 1, role: "subject" }],
    });
    const row = db
      .prepare("SELECT anchor_contact_id AS contactId FROM events WHERE id = ?")
      .get(eventId) as { contactId?: number | null };
    strictEqual(Number(row.contactId ?? 0), 1);
    db.close();
  });
});
