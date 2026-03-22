import type { AffinityDb } from "../database.ts";

/**
 * Support table capturing per-event mechanics applied to a relational link.
 */
export function initLinkEventEffectsTables(db: AffinityDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS link_event_effects (
      event_id INTEGER NOT NULL REFERENCES events (id) ON DELETE CASCADE,
      link_id INTEGER NOT NULL REFERENCES links (id) ON DELETE CASCADE,
      occurred_at INTEGER NOT NULL,
      base_weight REAL NOT NULL DEFAULT 0,
      impact_score REAL NOT NULL DEFAULT 0,
      moment_kind TEXT,
      directness REAL NOT NULL DEFAULT 0,
      affinity_delta REAL NOT NULL DEFAULT 0,
      trust_delta REAL NOT NULL DEFAULT 0,
      rank_delta INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (event_id, link_id),
      CHECK (
        moment_kind IS NULL OR moment_kind IN (
          'breakthrough', 'rupture', 'reconciliation', 'milestone', 'turning_point'
        )
      )
    )
  `);
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_link_event_effects_link_time ON link_event_effects(link_id, occurred_at DESC, event_id DESC)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_link_event_effects_moment ON link_event_effects(moment_kind, occurred_at DESC, impact_score DESC) WHERE moment_kind IS NOT NULL",
  );
}
