import { strictEqual, throws } from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { initAffinityTables } from "../init_affinity_tables.ts";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import {
  findLiveRelationalLinkAnyDirection,
  findLiveStructuralTie,
  findRelationalLinkId,
  getLinkRowById,
  requireRelationalLink,
} from "./queries.ts";

describe("links queries", () => {
  it("getLinkRowById returns null when missing or removed", () => {
    const db = new DatabaseSync(":memory:");
    initAffinityTables(db);
    strictEqual(getLinkRowById(db, 9), null);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("A", "human", 1, 1);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("B", "human", 1, 1);
    db.prepare(
      `INSERT INTO links (
         from_contact_id, to_contact_id, kind, is_structural, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(1, 2, "works_at", 1, 1, 1);
    db.prepare("UPDATE links SET removed_at = 2 WHERE id = 1").run();
    strictEqual(getLinkRowById(db, 1), null);
    db.close();
  });

  it("findRelationalLinkId and findLiveRelationalLinkAnyDirection ignore direction", () => {
    const db = new DatabaseSync(":memory:");
    initAffinityTables(db);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("A", "human", 1, 1);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("B", "human", 1, 1);
    db.prepare(
      `INSERT INTO links (
         from_contact_id, to_contact_id, kind, is_structural,
         rank, affinity, trust, state, created_at, updated_at
       ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
    ).run(1, 2, "personal", 3, 0.5, 0.9, "active", 1, 1);
    strictEqual(findRelationalLinkId(db, 2, 1), 1);
    strictEqual(findLiveRelationalLinkAnyDirection(db, 2, 1)?.id, 1);
    db.close();
  });

  it("findLiveStructuralTie is direction-sensitive and role-sensitive", () => {
    const db = new DatabaseSync(":memory:");
    initAffinityTables(db);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("A", "human", 1, 1);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("B", "human", 1, 1);
    db.prepare(
      `INSERT INTO links (
         from_contact_id, to_contact_id, kind, role, is_structural, created_at, updated_at
       ) VALUES (?, ?, ?, ?, 1, ?, ?)`,
    ).run(1, 2, "works_at", "lead", 1, 1);
    strictEqual(findLiveStructuralTie(db, 1, 2, "works_at", "lead")?.id, 1);
    strictEqual(findLiveStructuralTie(db, 2, 1, "works_at", "lead"), null);
    strictEqual(findLiveStructuralTie(db, 1, 2, "works_at", null), null);
    db.close();
  });

  it("requireRelationalLink rejects missing and structural rows", () => {
    const db = new DatabaseSync(":memory:");
    initAffinityTables(db);
    throws(
      () => requireRelationalLink(db, 999),
      (error: unknown) => error instanceof AffinityNotFoundError,
    );
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("A", "human", 1, 1);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("B", "human", 1, 1);
    db.prepare(
      `INSERT INTO links (
         from_contact_id, to_contact_id, kind, is_structural, created_at, updated_at
       ) VALUES (?, ?, ?, 1, ?, ?)`,
    ).run(1, 2, "works_at", 1, 1);
    throws(
      () => requireRelationalLink(db, 1),
      (error: unknown) => error instanceof AffinityInvariantError,
    );
    db.close();
  });
});
