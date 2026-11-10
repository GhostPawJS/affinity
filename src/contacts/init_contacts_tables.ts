import type { AffinityDb } from "../database.ts";

/**
 * Creates the `contacts` table and indices.
 */
export function initContactsTables(db: AffinityDb): void {
  migrateContactKinds(db);
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
      CHECK (kind IN ('human', 'agent', 'group', 'company', 'team', 'pet', 'service', 'other')),
      CHECK (lifecycle_state IN ('active', 'dormant', 'merged', 'lost')),
      CHECK (is_owner IN (0, 1)),
      FOREIGN KEY (merged_into_contact_id) REFERENCES contacts (id)
    )
  `);
  const columns = db.prepare("PRAGMA table_info(contacts)").all() as {
    name: string;
  }[];
  if (!columns.some((column) => column.name === "do_not_contact"))
    db.exec(
      "ALTER TABLE contacts ADD COLUMN do_not_contact INTEGER NOT NULL DEFAULT 0 CHECK (do_not_contact IN (0, 1))",
    );
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_one_live_owner ON contacts(is_owner) WHERE is_owner = 1 AND deleted_at IS NULL",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_contacts_kind_lifecycle ON contacts(kind, lifecycle_state) WHERE deleted_at IS NULL",
  );
}

function migrateContactKinds(db: AffinityDb): void {
  const row = db
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='contacts'",
    )
    .get() as { sql: string } | undefined;
  if (!row || row.sql.includes("'agent'")) return;
  const foreignKeys = db.prepare("PRAGMA foreign_keys").get() as {
    foreign_keys: number;
  };
  const objects = db
    .prepare(
      "SELECT sql FROM sqlite_master WHERE tbl_name='contacts' AND type IN ('index','trigger') AND sql IS NOT NULL",
    )
    .all() as { sql: string }[];
  const sequence = db
    .prepare("SELECT seq FROM sqlite_sequence WHERE name='contacts'")
    .get() as { seq: number } | undefined;
  db.exec("PRAGMA foreign_keys=OFF");
  if (
    (db.prepare("PRAGMA foreign_keys").get() as { foreign_keys: number })
      .foreign_keys
  )
    throw new Error(
      "Contact kind migration requires initialization outside a transaction with foreign keys enabled",
    );
  db.exec("SAVEPOINT affinity_contact_kinds");
  try {
    db.exec(
      row.sql
        .replace(
          /CREATE TABLE(?: IF NOT EXISTS)? ["`]?contacts["`]?/i,
          "CREATE TABLE contacts_agent_migration",
        )
        .replace("'human'", "'human', 'agent'"),
    );
    db.exec("INSERT INTO contacts_agent_migration SELECT * FROM contacts");
    db.exec("DROP TABLE contacts");
    db.exec("ALTER TABLE contacts_agent_migration RENAME TO contacts");
    for (const object of objects) db.exec(object.sql);
    if (sequence)
      db.prepare("UPDATE sqlite_sequence SET seq=? WHERE name='contacts'").run(
        sequence.seq,
      );
    db.exec("RELEASE affinity_contact_kinds");
  } catch (error) {
    db.exec("ROLLBACK TO affinity_contact_kinds");
    db.exec("RELEASE affinity_contact_kinds");
    throw error;
  } finally {
    db.exec(`PRAGMA foreign_keys=${foreignKeys.foreign_keys ? "ON" : "OFF"}`);
  }
}
