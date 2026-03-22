import type { AffinityDb } from "../database.ts";

/**
 * Creates the `event_participants` table and indices.
 */
export function initEventParticipantsTables(db: AffinityDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS event_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL REFERENCES events (id) ON DELETE CASCADE,
      contact_id INTEGER NOT NULL REFERENCES contacts (id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      CHECK (role IN ('actor', 'recipient', 'subject', 'observer', 'mentioned'))
    )
  `);
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_event_participants_unique_contact ON event_participants(event_id, contact_id)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_event_participants_contact ON event_participants(contact_id)",
  );
}
