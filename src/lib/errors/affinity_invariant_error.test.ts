import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { AffinityInvariantError } from "./affinity_invariant_error.ts";

describe("AffinityInvariantError", () => {
  it("uses INVARIANT code", () => {
    const err = new AffinityInvariantError("structural link cannot carry rank");
    strictEqual(err.code, "INVARIANT");
  });
});
