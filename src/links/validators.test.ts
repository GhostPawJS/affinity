import { throws } from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { initAffinityTables } from "../init_affinity_tables.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import {
  assertContactEndpointsNotMerged,
  assertValidLinkState,
  validateRelationalMechanics,
} from "./validators.ts";

describe("links validators", () => {
  it("accepts valid relational mechanics", () => {
    validateRelationalMechanics(0, 0, 0, "active");
    validateRelationalMechanics(3, 0.99, 1, "archived");
  });

  it("rejects invalid rank", () => {
    throws(
      () => validateRelationalMechanics(1.5, 0, 0, "active"),
      (error: unknown) => error instanceof AffinityValidationError,
    );
  });

  it("rejects affinity out of range", () => {
    throws(
      () => validateRelationalMechanics(0, 1, 0, "active"),
      (error: unknown) => error instanceof AffinityValidationError,
    );
  });

  it("rejects invalid state", () => {
    throws(
      () => validateRelationalMechanics(0, 0, 0, "merged"),
      (error: unknown) => error instanceof AffinityValidationError,
    );
    throws(
      () => assertValidLinkState("merged"),
      (error: unknown) => error instanceof AffinityValidationError,
    );
  });

  it("rejects missing and merged contact endpoints", () => {
    const db = new DatabaseSync(":memory:");
    initAffinityTables(db);
    throws(
      () => assertContactEndpointsNotMerged(db, 1, 2),
      (error: unknown) => error instanceof AffinityNotFoundError,
    );
    db.prepare(
      `INSERT INTO contacts
         (name, kind, lifecycle_state, created_at, updated_at)
       VALUES (?, ?, 'merged', ?, ?)`,
    ).run("A", "human", 1, 1);
    db.prepare(
      `INSERT INTO contacts
         (name, kind, lifecycle_state, created_at, updated_at)
       VALUES (?, ?, 'active', ?, ?)`,
    ).run("B", "human", 1, 1);
    throws(
      () => assertContactEndpointsNotMerged(db, 1, 2),
      (error: unknown) => error instanceof AffinityStateError,
    );
    db.close();
  });
});
