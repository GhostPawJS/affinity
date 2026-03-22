import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitializedAffinityDb } from "./create_initialized_affinity_db.ts";

describe("createInitializedAffinityDb", () => {
  it("installs the six public tables", async () => {
    const db = await createInitializedAffinityDb();
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
});
