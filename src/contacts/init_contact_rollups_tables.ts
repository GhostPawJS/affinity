import type { AffinityDb } from "../database.ts";

/**
 * Support table for materialized contact warnings and opaque profile rollups.
 */
export function initContactRollupsTables(db: AffinityDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS contact_rollups (
      contact_id INTEGER PRIMARY KEY REFERENCES contacts (id) ON DELETE CASCADE,
      warning_count INTEGER NOT NULL DEFAULT 0,
      warnings_json TEXT NOT NULL DEFAULT '[]',
      rollup_json TEXT NOT NULL DEFAULT '{}',
      updated_at INTEGER NOT NULL,
      CHECK (warning_count >= 0)
    )
  `);
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_contact_rollups_warning_count ON contact_rollups(warning_count DESC)",
  );
}
