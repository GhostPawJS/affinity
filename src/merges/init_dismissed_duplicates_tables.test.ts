import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";

describe("initDismissedDuplicatesTables", () => {
  it("creates the dismissed_duplicates table and indexes", async () => {
    const db = await createInitializedAffinityDb();

    const table = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='dismissed_duplicates'",
      )
      .get() as { name: string } | undefined;
    strictEqual(table?.name, "dismissed_duplicates");

    const leftIndex = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_dismissed_duplicates_left'",
      )
      .get() as { name: string } | undefined;
    strictEqual(leftIndex?.name, "idx_dismissed_duplicates_left");

    const rightIndex = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_dismissed_duplicates_right'",
      )
      .get() as { name: string } | undefined;
    strictEqual(rightIndex?.name, "idx_dismissed_duplicates_right");

    db.prepare(
      "INSERT INTO dismissed_duplicates (left_id, right_id, reason, dismissed_at) VALUES (1, 2, 'test', 1000)",
    ).run();
    const row = db
      .prepare("SELECT left_id, right_id FROM dismissed_duplicates")
      .get() as { left_id: number; right_id: number } | undefined;
    strictEqual(row?.left_id, 1);
    strictEqual(row?.right_id, 2);

    db.close();
  });

  it("is idempotent — calling init twice does not throw", async () => {
    const db = await createInitializedAffinityDb();
    // initAffinityTables already called it once; call again directly
    const { initDismissedDuplicatesTables } = await import(
      "./init_dismissed_duplicates_tables.ts"
    );
    initDismissedDuplicatesTables(db);
    db.close();
  });
});
