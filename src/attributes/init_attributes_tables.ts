import type { AffinityDb } from "../database.ts";
import { initEventsTables } from "../events/init_events_tables.ts";
import { withTransaction } from "../with_transaction.ts";

/**
 * Creates the `attributes` table and indices.
 */
export function initAttributesTables(db: AffinityDb): void {
  initEventsTables(db);
  db.exec(`
    CREATE TABLE IF NOT EXISTS attributes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER REFERENCES contacts (id) ON DELETE CASCADE,
      link_id INTEGER REFERENCES links (id) ON DELETE CASCADE,
      event_id INTEGER REFERENCES events (id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      value TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      CHECK (length(trim(name)) > 0),
      CHECK (
        (contact_id IS NOT NULL) + (link_id IS NOT NULL) + (event_id IS NOT NULL) = 1
      )
    )
  `);
  const columns = db.prepare("PRAGMA table_info(attributes)").all() as {
    name: string;
  }[];
  if (!columns.some((c) => c.name === "event_id")) {
    withTransaction(db, () =>
      db.exec(`CREATE TABLE attributes_upgrade (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
      link_id INTEGER REFERENCES links(id) ON DELETE CASCADE,
      event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
      name TEXT NOT NULL CHECK(length(trim(name)) > 0), value TEXT,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER,
      CHECK ((contact_id IS NOT NULL) + (link_id IS NOT NULL) + (event_id IS NOT NULL) = 1)
    );
    INSERT INTO attributes_upgrade (id,contact_id,link_id,name,value,created_at,updated_at,deleted_at)
      SELECT id,contact_id,link_id,name,value,created_at,updated_at,deleted_at FROM attributes;
    DROP TABLE attributes;
    ALTER TABLE attributes_upgrade RENAME TO attributes;`),
    );
  }
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_attributes_contact ON attributes(contact_id) WHERE deleted_at IS NULL",
  );
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_attributes_event_name_live ON attributes(event_id,name) WHERE deleted_at IS NULL AND event_id IS NOT NULL",
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
