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
  const columns = db.prepare("PRAGMA table_info(events)").all() as {
    name: string;
  }[];
  if (!columns.some((c) => c.name === "declared_moment_kind"))
    db.exec("ALTER TABLE events ADD COLUMN declared_moment_kind TEXT");
  if (!columns.some((c) => c.name === "content"))
    db.exec("ALTER TABLE events ADD COLUMN content TEXT");
  if (!columns.some((c) => c.name === "external_source"))
    db.exec("ALTER TABLE events ADD COLUMN external_source TEXT");
  if (!columns.some((c) => c.name === "external_id"))
    db.exec("ALTER TABLE events ADD COLUMN external_id TEXT");
  if (!columns.some((c) => c.name === "channel"))
    db.exec("ALTER TABLE events ADD COLUMN channel TEXT");
  if (!columns.some((c) => c.name === "parent_source"))
    db.exec("ALTER TABLE events ADD COLUMN parent_source TEXT");
  if (!columns.some((c) => c.name === "parent_ref_id"))
    db.exec("ALTER TABLE events ADD COLUMN parent_ref_id TEXT");
  if (!columns.some((c) => c.name === "parent_event_id"))
    db.exec("ALTER TABLE events ADD COLUMN parent_event_id INTEGER");
  if (!columns.some((c) => c.name === "thread_source"))
    db.exec("ALTER TABLE events ADD COLUMN thread_source TEXT");
  if (!columns.some((c) => c.name === "thread_id"))
    db.exec("ALTER TABLE events ADD COLUMN thread_id TEXT");
  if (!columns.some((c) => c.name === "provenance_json"))
    db.exec("ALTER TABLE events ADD COLUMN provenance_json TEXT");
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_events_external_ref ON events(external_source, external_id)",
  );
  if (!columns.some((column) => column.name === "occurred_on"))
    db.exec("ALTER TABLE events ADD COLUMN occurred_on TEXT");
}
