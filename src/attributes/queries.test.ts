import { strictEqual } from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { initAffinityTables } from "../init_affinity_tables.ts";
import {
  getAttributeRowById,
  getLiveAttributeRow,
  listLiveAttributeIdsForTarget,
} from "./queries.ts";

describe("attributes queries", () => {
  it("loads by id and live target/name", () => {
    const db = new DatabaseSync(":memory:");
    initAffinityTables(db);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("A", "human", 1, 1);
    db.prepare(
      `INSERT INTO attributes (contact_id, name, value, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(1, "nickname", "Ace", 1, 1);
    strictEqual(getAttributeRowById(db, 1)?.name, "nickname");
    strictEqual(
      getLiveAttributeRow(db, { kind: "contact", id: 1 }, "nickname")?.id,
      1,
    );
    strictEqual(
      listLiveAttributeIdsForTarget(db, { kind: "contact", id: 1 }).length,
      1,
    );
    db.close();
  });
});
