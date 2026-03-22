import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AffinityConflictError,
  type AffinityError,
  AffinityInvariantError,
  AffinityMergeError,
  AffinityNotFoundError,
  AffinityStateError,
  AffinityValidationError,
  isAffinityError,
} from "./errors.ts";

describe("errors barrel (public)", () => {
  it("exports all six subclasses with distinct codes", () => {
    const samples: { err: AffinityError; code: string }[] = [
      { err: new AffinityNotFoundError("a"), code: "NOT_FOUND" },
      { err: new AffinityConflictError("b"), code: "CONFLICT" },
      { err: new AffinityInvariantError("c"), code: "INVARIANT" },
      { err: new AffinityValidationError("d"), code: "VALIDATION" },
      { err: new AffinityMergeError("e"), code: "MERGE" },
      { err: new AffinityStateError("f"), code: "STATE" },
    ];
    const codes = new Set(samples.map((s) => s.err.code));
    strictEqual(codes.size, 6);
    for (const { err, code } of samples) {
      strictEqual(err.code, code);
      strictEqual(isAffinityError(err), true);
    }
  });
});
