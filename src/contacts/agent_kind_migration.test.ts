import assert from "node:assert/strict";
import { test } from "node:test";
import { initIdentitiesTables } from "../identities/init_identities_tables.ts";
import { initAffinityTables } from "../init_affinity_tables.ts";
import { openTestDatabase } from "../lib/testing/open_test_database.ts";
import * as write from "../write.ts";

test("old contact CHECK upgrades without losing rows, references or indices", async () => {
  const db = await openTestDatabase();
  try {
    db.exec(`CREATE TABLE contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, kind TEXT NOT NULL,
      lifecycle_state TEXT NOT NULL DEFAULT 'active', is_owner INTEGER NOT NULL DEFAULT 0,
      merged_into_contact_id INTEGER REFERENCES contacts(id), created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL, deleted_at INTEGER,
      CHECK(length(trim(name)) > 0),
      CHECK(kind IN ('human','group','company','team','pet','service','other')),
      CHECK(lifecycle_state IN ('active','dormant','merged','lost')), CHECK(is_owner IN (0,1))
    )`);
    db.exec(
      "INSERT INTO contacts(id,name,kind,is_owner,created_at,updated_at) VALUES (1,'Owner','human',1,1,1)",
    );
    const owner = { id: 1 };
    initIdentitiesTables(db);
    db.exec(
      "INSERT INTO identities(id,contact_id,type,value,normalized_key,created_at,updated_at) VALUES (1,1,'email','owner@example.com','email:owner@example.com',1,1)",
    );
    const identity = { id: 1 };
    db.exec(
      "CREATE UNIQUE INDEX idx_contacts_one_live_owner ON contacts(is_owner) WHERE is_owner=1 AND deleted_at IS NULL",
    );
    const { initContactsTables } = await import("./init_contacts_tables.ts");
    initAffinityTables(db);
    const agent = write.createContact(db, {
      name: "Agent",
      kind: "agent",
    }).primary;
    assert.equal(agent.kind, "agent");
    assert.equal(
      db
        .prepare("SELECT contact_id FROM identities WHERE id=?")
        .get<{ contact_id: number }>(identity.id)?.contact_id,
      owner.id,
    );
    assert.equal(
      db.prepare("PRAGMA foreign_keys").get<{ foreign_keys: number }>()
        ?.foreign_keys,
      1,
    );
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
    assert.throws(() =>
      write.createContact(db, {
        name: "Second owner",
        kind: "human",
        bootstrapOwner: true,
      }),
    );
    initContactsTables(db);
    assert.equal(
      db.prepare("SELECT COUNT(*) AS n FROM contacts").get<{ n: number }>()?.n,
      2,
    );
  } finally {
    db.close();
  }
});
