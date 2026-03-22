import { strictEqual, throws } from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { initAffinityTables } from "../init_affinity_tables.ts";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import {
  findOwnerContactId,
  getContactRowById,
  requireOwnerContactId,
} from "./queries.ts";

describe("contacts queries", () => {
  it("getContactRowById returns null when missing or soft-deleted", () => {
    const db = new DatabaseSync(":memory:");
    initAffinityTables(db);
    strictEqual(getContactRowById(db, 999), null);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("A", "human", 1, 1);
    db.prepare("UPDATE contacts SET deleted_at = 2 WHERE id = 1").run();
    strictEqual(getContactRowById(db, 1), null);
    db.close();
  });

  it("getContactRowById returns a row for live contacts", () => {
    const db = new DatabaseSync(":memory:");
    initAffinityTables(db);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("A", "human", 1, 1);
    const row = getContactRowById(db, 1);
    strictEqual(row?.name, "A");
    db.close();
  });

  it("findOwnerContactId and requireOwnerContactId share owner lookup semantics", () => {
    const db = new DatabaseSync(":memory:");
    initAffinityTables(db);
    strictEqual(findOwnerContactId(db), null);
    throws(
      () => requireOwnerContactId(db),
      (error: unknown) => error instanceof AffinityInvariantError,
    );
    db.prepare(
      `INSERT INTO contacts
         (name, kind, lifecycle_state, is_owner, created_at, updated_at)
       VALUES (?, ?, 'active', 1, ?, ?)`,
    ).run("Owner", "human", 1, 1);
    strictEqual(findOwnerContactId(db), 1);
    strictEqual(requireOwnerContactId(db), 1);
    db.prepare("UPDATE contacts SET deleted_at = 2 WHERE id = 1").run();
    strictEqual(findOwnerContactId(db), null);
    throws(
      () => requireOwnerContactId(db),
      (error: unknown) => error instanceof AffinityInvariantError,
    );
    db.close();
  });
});
