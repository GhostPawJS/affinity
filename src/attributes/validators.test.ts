import { strictEqual, throws } from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { initAffinityTables } from "../init_affinity_tables.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import {
  assertAttributeTargetWritable,
  validateAttributeEntries,
  validateAttributeName,
} from "./validators.ts";

describe("attributes validators", () => {
  it("validates names and replacement entries", () => {
    strictEqual(validateAttributeName(" nickname "), "nickname");
    const entries = validateAttributeEntries([
      { name: " tag ", value: null },
      { name: "note", value: "  hi  " },
    ]);
    strictEqual(entries[0]?.value, null);
    strictEqual(entries[1]?.value, "hi");
    throws(
      () =>
        validateAttributeEntries([
          { name: " name ", value: "a" },
          { name: "name", value: "b" },
        ]),
      (error: unknown) => error instanceof AffinityValidationError,
    );
  });

  it("checks attribute targets for missing and merged contacts", () => {
    const db = new DatabaseSync(":memory:");
    initAffinityTables(db);
    throws(
      () => assertAttributeTargetWritable(db, { kind: "contact", id: 1 }),
      (error: unknown) => error instanceof AffinityNotFoundError,
    );
    db.prepare(
      `INSERT INTO contacts
         (name, kind, lifecycle_state, created_at, updated_at)
       VALUES (?, ?, 'merged', ?, ?)`,
    ).run("A", "human", 1, 1);
    throws(
      () => assertAttributeTargetWritable(db, { kind: "contact", id: 1 }),
      (error: unknown) => error instanceof AffinityStateError,
    );
    db.close();
  });

  it("rejects link target when link endpoint is merged", () => {
    const db = new DatabaseSync(":memory:");
    initAffinityTables(db);
    db.prepare(
      `INSERT INTO contacts (name, kind, lifecycle_state, created_at, updated_at)
       VALUES (?, ?, 'active', ?, ?)`,
    ).run("A", "human", 1, 1);
    db.prepare(
      `INSERT INTO contacts (name, kind, lifecycle_state, created_at, updated_at)
       VALUES (?, ?, 'merged', ?, ?)`,
    ).run("B", "human", 1, 1);
    db.prepare(
      `INSERT INTO links (from_contact_id, to_contact_id, kind, role, is_structural, rank, affinity, trust, state, cadence_days, created_at, updated_at)
       VALUES (1, 2, 'personal', 'friend', 0, 0, 0, 0, 'active', NULL, 1, 1)`,
    ).run();
    throws(
      () => assertAttributeTargetWritable(db, { kind: "link", id: 1 }),
      (error: unknown) => error instanceof AffinityStateError,
    );
    db.close();
  });
});
