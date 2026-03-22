import { strictEqual, throws } from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { initAffinityTables } from "../init_affinity_tables.ts";
import { AffinityConflictError } from "../lib/errors/affinity_conflict_error.ts";
import { assertNoIdentityCollision } from "./validators.ts";

describe("identities validators", () => {
  it("throws when a live row matches", () => {
    const db = new DatabaseSync(":memory:");
    initAffinityTables(db);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("A", "human", 1, 1);
    db.prepare(
      `INSERT INTO identities (contact_id, type, value, normalized_key, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(1, "email", "a@b", "email:a@b", 1, 1);
    throws(
      () => assertNoIdentityCollision(db, "email:a@b"),
      (error: unknown) => error instanceof AffinityConflictError,
    );
    db.close();
  });

  it("ignores excluded id and removed rows", () => {
    const db = new DatabaseSync(":memory:");
    initAffinityTables(db);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("A", "human", 1, 1);
    db.prepare(
      `INSERT INTO identities (contact_id, type, value, normalized_key, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(1, "email", "a@b", "email:a@b", 1, 1);
    assertNoIdentityCollision(db, "email:a@b", 1);
    db.prepare("UPDATE identities SET removed_at = 2 WHERE id = 1").run();
    assertNoIdentityCollision(db, "email:a@b");
    strictEqual(true, true);
    db.close();
  });
});
