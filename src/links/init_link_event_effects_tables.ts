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
  const columns = db.prepare("PRAGMA table_info(link_event_effects)").all() as {
    name: string;
  }[];
  if (!columns.some((column) => column.name === "counts_for_recency")) {
    db.exec(
      "ALTER TABLE link_event_effects ADD COLUMN counts_for_recency INTEGER NOT NULL DEFAULT 1",
    );
  }
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_link_event_effects_link_time ON link_event_effects(link_id, occurred_at DESC, event_id DESC)",
  );
  for (const name of ["participant_json", "provenance_json"])
    if (!columns.some((c) => c.name === name))
      db.exec(`ALTER TABLE link_event_effects ADD COLUMN ${name} TEXT`);
  db.exec(
    "CREATE TABLE IF NOT EXISTS event_link_baselines (link_id INTEGER PRIMARY KEY REFERENCES links(id) ON DELETE CASCADE, state_json TEXT NOT NULL)",
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS event_link_state_changes (id INTEGER PRIMARY KEY AUTOINCREMENT, link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE, after_event_id INTEGER NOT NULL, state TEXT NOT NULL)",
  );
  // Historical deltas retain the original affinity/trust/rank even across promotions.
  db.exec(`INSERT OR IGNORE INTO event_link_baselines(link_id,state_json)
    SELECT l.id,json_object('rank',l.rank-COALESCE(SUM(e.rank_delta),0),'affinity',l.affinity-COALESCE(SUM(e.affinity_delta),0),'trust',l.trust-COALESCE(SUM(e.trust_delta),0),'state','active','cadence_days',NULL)
    FROM links l JOIN link_event_effects e ON e.link_id=l.id GROUP BY l.id`);
  db.exec(
    "UPDATE link_event_effects SET counts_for_recency = 0 WHERE event_id IN (SELECT id FROM events WHERE type IN ('promise', 'agreement'))",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_link_event_effects_moment ON link_event_effects(moment_kind, occurred_at DESC, impact_score DESC) WHERE moment_kind IS NOT NULL",
  );
}
