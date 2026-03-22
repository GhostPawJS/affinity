import type { AffinityDb } from "../database.ts";

/**
 * Creates the `attributes` table and indices.
 */
export function initAttributesTables(db: AffinityDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS attributes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER REFERENCES contacts (id) ON DELETE CASCADE,
      link_id INTEGER REFERENCES links (id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      value TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      CHECK (length(trim(name)) > 0),
      CHECK (
        (contact_id IS NOT NULL AND link_id IS NULL)
        OR
        (contact_id IS NULL AND link_id IS NOT NULL)
      )
    )
  `);
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_attributes_contact ON attributes(contact_id) WHERE deleted_at IS NULL",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_attributes_link ON attributes(link_id) WHERE deleted_at IS NULL",
  );
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_attributes_contact_name_live
    ON attributes(contact_id, name)
    WHERE deleted_at IS NULL AND contact_id IS NOT NULL
  `);
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_attributes_link_name_live
    ON attributes(link_id, name)
    WHERE deleted_at IS NULL AND link_id IS NOT NULL
  `);
}
