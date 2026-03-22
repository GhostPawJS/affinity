import type { AffinityDb } from "../database.ts";

/**
 * Creates the `events` table and indices.
 */
export function initEventsTables(db: AffinityDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      occurred_at INTEGER NOT NULL,
      summary TEXT NOT NULL,
      significance REAL NOT NULL DEFAULT 0,
      moment_kind TEXT,
      recurrence_kind TEXT,
      anchor_month INTEGER,
      anchor_day INTEGER,
      anchor_contact_id INTEGER REFERENCES contacts (id) ON DELETE CASCADE,
      anchor_link_id INTEGER REFERENCES links (id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      CHECK (length(trim(summary)) > 0),
      CHECK (
        type IN (
          'conversation', 'activity', 'gift', 'support', 'milestone', 'observation',
          'conflict', 'correction', 'transaction', 'promise', 'agreement', 'date_anchor'
        )
      ),
      CHECK (
        (type = 'date_anchor' AND (
          (anchor_contact_id IS NOT NULL AND anchor_link_id IS NULL)
          OR (anchor_contact_id IS NULL AND anchor_link_id IS NOT NULL)
        ))
        OR (type != 'date_anchor' AND anchor_contact_id IS NULL AND anchor_link_id IS NULL)
      ),
      CHECK (moment_kind IS NULL OR moment_kind IN (
        'breakthrough', 'rupture', 'reconciliation', 'milestone', 'turning_point'
      )),
      CHECK (recurrence_kind IS NULL OR recurrence_kind IN (
        'birthday', 'anniversary', 'renewal', 'memorial', 'custom_yearly'
      )),
      CHECK (anchor_month IS NULL OR (anchor_month >= 1 AND anchor_month <= 12)),
      CHECK (anchor_day IS NULL OR (anchor_day >= 1 AND anchor_day <= 31))
    )
  `);
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON events(occurred_at DESC) WHERE deleted_at IS NULL",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_events_type ON events(type) WHERE deleted_at IS NULL",
  );
}
