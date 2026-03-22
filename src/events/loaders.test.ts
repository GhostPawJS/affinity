import { strictEqual, throws } from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { initAffinityTables } from "../init_affinity_tables.ts";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import {
  loadEventParticipantViews,
  loadEventRecord,
  requireDateAnchorEvent,
} from "./loaders.ts";

describe("events loaders", () => {
  it("loads participant views and event records", () => {
    const db = new DatabaseSync(":memory:");
    initAffinityTables(db);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("A", "human", 1, 1);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("B", "human", 1, 1);
    db.prepare(
      "INSERT INTO events (type, occurred_at, summary, significance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("conversation", 1, "hello", 5, 1, 1);
    db.prepare(
      "INSERT INTO event_participants (event_id, contact_id, role) VALUES (?, ?, ?), (?, ?, ?)",
    ).run(1, 1, "actor", 1, 2, "recipient");
    const participants = loadEventParticipantViews(db, 1);
    strictEqual(participants.length, 2);
    const record = loadEventRecord(db, 1);
    strictEqual(record.summary, "hello");
    strictEqual(record.participants.length, 2);
    db.close();
  });

  it("requires date anchor rows specifically", () => {
    const db = new DatabaseSync(":memory:");
    initAffinityTables(db);
    throws(
      () => requireDateAnchorEvent(db, 1),
      (error: unknown) => error instanceof AffinityNotFoundError,
    );
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("A", "human", 1, 1);
    db.prepare(
      "INSERT INTO events (type, occurred_at, summary, significance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("conversation", 1, "hello", 5, 1, 1);
    throws(
      () => requireDateAnchorEvent(db, 1),
      (error: unknown) => error instanceof AffinityInvariantError,
    );
    db.prepare(
      `INSERT INTO events (
         type, occurred_at, summary, significance, recurrence_kind, anchor_month, anchor_day,
         anchor_contact_id, created_at, updated_at
       ) VALUES ('date_anchor', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(1, "birthday", 5, "birthday", 3, 15, 1, 1, 1);
    strictEqual(requireDateAnchorEvent(db, 2).type, "date_anchor");
    db.close();
  });
});
