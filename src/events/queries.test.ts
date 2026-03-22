import { strictEqual } from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { initAffinityTables } from "../init_affinity_tables.ts";
import { findDuplicateDateAnchor, getEventRowById } from "./queries.ts";

describe("events queries", () => {
  it("getEventRowById returns null when missing or deleted", () => {
    const db = new DatabaseSync(":memory:");
    initAffinityTables(db);
    strictEqual(getEventRowById(db, 1), null);
    db.prepare(
      "INSERT INTO events (type, occurred_at, summary, significance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("conversation", 1, "x", 5, 1, 1);
    db.prepare("UPDATE events SET deleted_at = 2 WHERE id = 1").run();
    strictEqual(getEventRowById(db, 1), null);
    db.close();
  });

  it("findDuplicateDateAnchor finds contact and link duplicates while honoring exclude", () => {
    const db = new DatabaseSync(":memory:");
    initAffinityTables(db);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("A", "human", 1, 1);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("B", "human", 1, 1);
    db.prepare(
      `INSERT INTO links (from_contact_id, to_contact_id, kind, is_structural, rank, affinity, trust, state, created_at, updated_at)
       VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
    ).run(1, 2, "personal", 1, 0.5, 0.5, "active", 1, 1);
    db.prepare(
      `INSERT INTO events (
         type, occurred_at, summary, significance, recurrence_kind, anchor_month, anchor_day,
         anchor_contact_id, created_at, updated_at
       ) VALUES ('date_anchor', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(1, "birthday", 5, "birthday", 3, 15, 1, 1, 1);
    db.prepare(
      `INSERT INTO events (
         type, occurred_at, summary, significance, recurrence_kind, anchor_month, anchor_day,
         anchor_link_id, created_at, updated_at
       ) VALUES ('date_anchor', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(1, "anniv", 5, "anniversary", 6, 1, 1, 1, 1);
    strictEqual(
      findDuplicateDateAnchor(db, {
        recurrenceKind: "birthday",
        anchorMonth: 3,
        anchorDay: 15,
        anchorContactId: 1,
        anchorLinkId: null,
      }),
      1,
    );
    strictEqual(
      findDuplicateDateAnchor(db, {
        recurrenceKind: "birthday",
        anchorMonth: 3,
        anchorDay: 15,
        anchorContactId: 1,
        anchorLinkId: null,
        excludeEventId: 1,
      }),
      null,
    );
    strictEqual(
      findDuplicateDateAnchor(db, {
        recurrenceKind: "anniversary",
        anchorMonth: 6,
        anchorDay: 1,
        anchorContactId: null,
        anchorLinkId: 1,
      }),
      2,
    );
    db.close();
  });
});
