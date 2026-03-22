import type { AffinityDb } from "../database.ts";

/**
 * Creates the `contacts` table and indices.
 */
export function initContactsTables(db: AffinityDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      lifecycle_state TEXT NOT NULL DEFAULT 'active',
      is_owner INTEGER NOT NULL DEFAULT 0,
      merged_into_contact_id INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      CHECK (length(trim(name)) > 0),
      CHECK (kind IN ('human', 'group', 'company', 'team', 'pet', 'service', 'other')),
      CHECK (lifecycle_state IN ('active', 'dormant', 'merged', 'lost')),
      CHECK (is_owner IN (0, 1)),
      FOREIGN KEY (merged_into_contact_id) REFERENCES contacts (id)
    )
  `);
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_one_live_owner ON contacts(is_owner) WHERE is_owner = 1 AND deleted_at IS NULL",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_contacts_kind_lifecycle ON contacts(kind, lifecycle_state) WHERE deleted_at IS NULL",
  );
}
