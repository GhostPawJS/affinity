import { strictEqual } from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { initContactsTables } from "../contacts/init_contacts_tables.ts";
import { initEventsTables } from "../events/init_events_tables.ts";
import { initLinkRollupsTables } from "./init_link_rollups_tables.ts";
import { initLinksTables } from "./init_links_tables.ts";

describe("initLinkRollupsTables", () => {
  it("is idempotent once links and events exist", () => {
    const db = new DatabaseSync(":memory:");
    initContactsTables(db);
    initLinksTables(db);
    initEventsTables(db);
    initLinkRollupsTables(db);
    initLinkRollupsTables(db);
    db.prepare(
      "INSERT INTO contacts (name, kind, is_owner, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    ).run("Owner", "human", 1, 1, 1);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("Other", "human", 1, 1);
    db.prepare(
      `INSERT INTO links (
         from_contact_id, to_contact_id, kind, role, is_structural,
         rank, affinity, trust, state, cadence_days, bond, created_at, updated_at
       ) VALUES (?, ?, ?, NULL, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(1, 2, "personal", 1, 0.25, 0.5, "active", 14, null, 1, 1);
    db.prepare(
      "INSERT INTO events (type, occurred_at, summary, significance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("conversation", 1, "hello", 5, 1, 1);
    db.prepare(
      `INSERT INTO link_rollups (
         link_id, last_event_id, last_meaningful_event_at, total_meaningful_events,
         positive_meaningful_events, outbound_count, inbound_count, normalized_rank,
         reciprocity_score, recency_score, drift_priority, readiness_score, radar_score,
         edge_weight, rollup_json, derivation_json, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0.22,
      0.5,
      0.8,
      0.2,
      0.4,
      0.3,
      0.35,
      "{}",
      "{}",
      1,
    );
    const row = db
      .prepare(
        "SELECT readiness_score, radar_score FROM link_rollups WHERE link_id = ?",
      )
      .get(1) as { readiness_score: number; radar_score: number };
    strictEqual(row.readiness_score, 0.4);
    strictEqual(row.radar_score, 0.3);
    db.close();
  });
});
