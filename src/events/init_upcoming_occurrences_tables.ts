import type { AffinityDb } from "../database.ts";

/**
 * Materialized next calendar occurrence per date-anchor event — CONCEPT.md `upcoming_occurrences`.
 */
export function initUpcomingOccurrencesTables(db: AffinityDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS upcoming_occurrences (
      event_id INTEGER PRIMARY KEY REFERENCES events (id) ON DELETE CASCADE,
      occurs_on INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_upcoming_occurrences_occurs_on ON upcoming_occurrences(occurs_on ASC)",
  );
}
