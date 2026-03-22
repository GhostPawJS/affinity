import type { AffinityDb } from "../database.ts";

/**
 * Support table for deterministic merge lineage — CONCEPT.md `contact_merges`.
 */
export function initContactMergesTables(db: AffinityDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS contact_merges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      winner_contact_id INTEGER NOT NULL REFERENCES contacts (id),
      loser_contact_id INTEGER NOT NULL REFERENCES contacts (id),
      merged_at INTEGER NOT NULL,
      reason_summary TEXT,
      manual INTEGER NOT NULL DEFAULT 1,
      CHECK (winner_contact_id != loser_contact_id),
      CHECK (manual IN (0, 1))
    )
  `);
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_contact_merges_winner ON contact_merges(winner_contact_id)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_contact_merges_loser ON contact_merges(loser_contact_id)",
  );
}
