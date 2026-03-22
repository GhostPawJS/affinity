import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { initAffinityTables } from "./init_affinity_tables.ts";
import { openTestDatabase } from "./lib/testing/open_test_database.ts";

describe("initAffinityTables", () => {
  it("creates the six canonical tables in dependency order", async () => {
    const db = await openTestDatabase();
    initAffinityTables(db);
    const row = db
      .prepare(
        `SELECT COUNT(*) AS total
         FROM sqlite_master
         WHERE type = 'table'
           AND name IN (
             'contacts',
             'identities',
             'links',
             'events',
             'event_participants',
             'attributes'
           )`,
      )
      .get() as { total?: number };
    strictEqual(Number(row?.total ?? 0), 6);
    db.close();
  });

  it("creates the required internal support tables", async () => {
    const db = await openTestDatabase();
    initAffinityTables(db);
    const row = db
      .prepare(
        `SELECT COUNT(*) AS total
         FROM sqlite_master
         WHERE type = 'table'
           AND name IN (
             'contact_merges',
             'contact_rollups',
             'link_rollups',
             'link_event_effects',
             'upcoming_occurrences',
             'open_commitments'
           )`,
      )
      .get() as { total?: number };
    strictEqual(Number(row?.total ?? 0), 6);
    db.close();
  });

  it("is idempotent on an empty database", async () => {
    const db = await openTestDatabase();
    initAffinityTables(db);
    initAffinityTables(db);
    strictEqual(
      Number(
        db
          .prepare(
            "SELECT COUNT(*) AS c FROM sqlite_master WHERE type = 'table' AND name = 'contacts'",
          )
          .get()?.c ?? 0,
      ),
      1,
    );
    db.close();
  });
});
