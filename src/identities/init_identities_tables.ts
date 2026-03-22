import type { AffinityDb } from "../database.ts";

/**
 * Creates the `identities` table and indices.
 */
export function initIdentitiesTables(db: AffinityDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS identities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER NOT NULL REFERENCES contacts (id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      value TEXT NOT NULL,
      label TEXT,
      normalized_key TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 0,
      verified_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      removed_at INTEGER,
      CHECK (length(trim(type)) > 0),
      CHECK (length(trim(value)) > 0),
      CHECK (length(trim(normalized_key)) > 0),
      CHECK (verified IN (0, 1))
    )
  `);
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_identities_normalized_live ON identities(normalized_key) WHERE removed_at IS NULL",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_identities_contact_id ON identities(contact_id) WHERE removed_at IS NULL",
  );
}
