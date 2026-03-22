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
      directionality TEXT,
      CHECK (
        directionality IS NULL OR directionality IN (
          'owner_initiated', 'other_initiated', 'mutual', 'observed'
        )
      ),
      CHECK (role IN ('actor', 'recipient', 'subject', 'observer', 'mentioned'))
    )
  `);
  const columns = db.prepare("PRAGMA table_info(event_participants)").all() as {
    name: string;
  }[];
  if (!columns.some((column) => column.name === "directionality")) {
    db.exec(
      `ALTER TABLE event_participants
       ADD COLUMN directionality TEXT
       CHECK (
         directionality IS NULL OR directionality IN (
           'owner_initiated', 'other_initiated', 'mutual', 'observed'
         )
       )`,
    );
  }
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_event_participants_unique_contact ON event_participants(event_id, contact_id)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_event_participants_contact ON event_participants(contact_id)",
  );
}
