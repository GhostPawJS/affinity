import type { AffinityDb } from "../database.ts";

/**
 * Creates the `links` table and indices (structural ties and relational links).
 */
export function initLinksTables(db: AffinityDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_contact_id INTEGER NOT NULL REFERENCES contacts (id) ON DELETE CASCADE,
      to_contact_id INTEGER NOT NULL REFERENCES contacts (id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      role TEXT,
      is_structural INTEGER NOT NULL,
      rank INTEGER,
      affinity REAL,
      trust REAL,
      state TEXT,
      cadence_days INTEGER,
      bond TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      removed_at INTEGER,
      CHECK (is_structural IN (0, 1)),
      CHECK (
        (is_structural = 1
          AND kind IN (
            'works_at', 'manages', 'member_of', 'married_to', 'partner_of', 'parent_of',
            'child_of', 'sibling_of', 'friend_of', 'client_of', 'vendor_of', 'reports_to',
            'belongs_to', 'other_structural'
          )
          AND rank IS NULL AND affinity IS NULL AND trust IS NULL AND state IS NULL AND cadence_days IS NULL)
        OR
        (is_structural = 0
          AND kind IN (
            'personal', 'family', 'professional', 'romantic', 'care', 'service', 'observed',
            'other_relational'
          )
          AND rank IS NOT NULL AND rank >= 0
          AND affinity IS NOT NULL AND affinity >= 0 AND affinity < 1
          AND trust IS NOT NULL AND trust >= 0 AND trust <= 1
          AND state IS NOT NULL
          AND state IN ('active', 'dormant', 'strained', 'broken', 'archived'))
      )
    )
  `);
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_links_from ON links(from_contact_id) WHERE removed_at IS NULL",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_links_to ON links(to_contact_id) WHERE removed_at IS NULL",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_links_kind_state ON links(kind, state) WHERE removed_at IS NULL AND is_structural = 0",
  );
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_links_unique_relational ON links(from_contact_id, to_contact_id, kind) WHERE removed_at IS NULL AND is_structural = 0",
  );
}
