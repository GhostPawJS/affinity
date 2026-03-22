import { strictEqual } from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { initContactRollupsTables } from "./init_contact_rollups_tables.ts";
import { initContactsTables } from "./init_contacts_tables.ts";

describe("initContactRollupsTables", () => {
  it("is idempotent once contacts exist", () => {
    const db = new DatabaseSync(":memory:");
    initContactsTables(db);
    initContactRollupsTables(db);
    initContactRollupsTables(db);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("A", "human", 1, 1);
    db.prepare(
      `INSERT INTO contact_rollups
         (contact_id, warning_count, warnings_json, rollup_json, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(1, 1, '["missing_identity"]', '{"profileCompleteness":0.5}', 1);
    const row = db
      .prepare(
        "SELECT warning_count, warnings_json FROM contact_rollups WHERE contact_id = ?",
      )
      .get(1) as { warning_count: number; warnings_json: string };
    strictEqual(row.warning_count, 1);
    strictEqual(row.warnings_json, '["missing_identity"]');
    db.close();
  });
});
