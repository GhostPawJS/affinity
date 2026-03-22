import type { AffinityDb } from "../database.ts";

/**
 * Support table for materialized relational link rollups used by read surfaces.
 */
export function initLinkRollupsTables(db: AffinityDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS link_rollups (
      link_id INTEGER PRIMARY KEY REFERENCES links (id) ON DELETE CASCADE,
      last_event_id INTEGER REFERENCES events (id) ON DELETE SET NULL,
      last_meaningful_event_at INTEGER,
      total_meaningful_events INTEGER NOT NULL DEFAULT 0,
      positive_meaningful_events INTEGER NOT NULL DEFAULT 0,
      outbound_count INTEGER NOT NULL DEFAULT 0,
      inbound_count INTEGER NOT NULL DEFAULT 0,
      normalized_rank REAL NOT NULL DEFAULT 0,
      reciprocity_score REAL NOT NULL DEFAULT 0,
      recency_score REAL NOT NULL DEFAULT 0,
      drift_priority REAL NOT NULL DEFAULT 0,
      readiness_score REAL NOT NULL DEFAULT 0,
      radar_score REAL NOT NULL DEFAULT 0,
      bridge_score REAL NOT NULL DEFAULT 0.1,
      edge_weight REAL NOT NULL DEFAULT 0,
      rollup_json TEXT NOT NULL DEFAULT '{}',
      derivation_json TEXT NOT NULL DEFAULT '{}',
      updated_at INTEGER NOT NULL,
      CHECK (total_meaningful_events >= 0),
      CHECK (positive_meaningful_events >= 0),
      CHECK (outbound_count >= 0),
      CHECK (inbound_count >= 0)
    )
  `);
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_link_rollups_last_meaningful_event_at ON link_rollups(last_meaningful_event_at DESC)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_link_rollups_readiness_score ON link_rollups(readiness_score DESC)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_link_rollups_radar_score ON link_rollups(radar_score DESC)",
  );
}
