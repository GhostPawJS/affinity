import type { AffinityDb } from "../database.ts";

/**
 * Support table for duplicate pair dismissals — prevents false-positive pairs from
 * resurfacing indefinitely in listDuplicateCandidates.
 * left_id < right_id enforces canonical ordering (same logic as pairKey).
 */
export function initDismissedDuplicatesTables(db: AffinityDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS dismissed_duplicates (
      left_id      INTEGER NOT NULL,
      right_id     INTEGER NOT NULL,
      reason       TEXT,
      dismissed_at INTEGER NOT NULL,
      PRIMARY KEY (left_id, right_id),
      CHECK (left_id < right_id)
    )
  `);
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_dismissed_duplicates_left ON dismissed_duplicates(left_id)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_dismissed_duplicates_right ON dismissed_duplicates(right_id)",
  );
}
