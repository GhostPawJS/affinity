import type { AffinityDb } from "../database.ts";

/**
 * Internal support table for unresolved `promise` / `agreement` events — CONCEPT.md.
 */
export function initOpenCommitmentsTables(db: AffinityDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS open_commitments (
      event_id INTEGER PRIMARY KEY REFERENCES events (id) ON DELETE CASCADE,
      commitment_type TEXT NOT NULL,
      due_at INTEGER,
      resolved_at INTEGER,
      resolution TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      CHECK (commitment_type IN ('promise', 'agreement')),
      CHECK (resolution IS NULL OR resolution IN ('kept', 'cancelled', 'broken')),
      CHECK (
        (resolved_at IS NULL AND resolution IS NULL)
        OR (resolved_at IS NOT NULL AND resolution IS NOT NULL)
      )
    )
  `);
}
