import { strictEqual } from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { initAffinityTables } from "../init_affinity_tables.ts";
import { getIdentityRowById } from "./queries.ts";

describe("identities queries", () => {
  it("returns null when missing or removed", () => {
    const db = new DatabaseSync(":memory:");
    initAffinityTables(db);
    strictEqual(getIdentityRowById(db, 9), null);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("A", "human", 1, 1);
    db.prepare(
      `INSERT INTO identities (contact_id, type, value, normalized_key, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(1, "email", "a@b", "email:a@b", 1, 1);
    db.prepare("UPDATE identities SET removed_at = 2 WHERE id = 1").run();
    strictEqual(getIdentityRowById(db, 1), null);
    db.close();
  });
});
