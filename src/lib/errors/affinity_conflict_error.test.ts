import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { AffinityConflictError } from "./affinity_conflict_error.ts";

describe("AffinityConflictError", () => {
  it("uses CONFLICT code", () => {
    const err = new AffinityConflictError("duplicate identity");
    strictEqual(err.code, "CONFLICT");
    strictEqual(err.name, "AffinityConflictError");
  });
});
