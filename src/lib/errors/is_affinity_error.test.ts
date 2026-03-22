import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { AffinityNotFoundError } from "./affinity_not_found_error.ts";
import { AffinityValidationError } from "./affinity_validation_error.ts";
import { isAffinityError } from "./is_affinity_error.ts";

describe("isAffinityError", () => {
  it("returns true for any AffinityError subclass", () => {
    strictEqual(isAffinityError(new AffinityNotFoundError("x")), true);
    strictEqual(isAffinityError(new AffinityValidationError("y")), true);
  });

  it("returns false for plain Error and non-errors", () => {
    strictEqual(isAffinityError(new Error("plain")), false);
    strictEqual(isAffinityError(null), false);
    strictEqual(isAffinityError({ code: "NOT_FOUND" }), false);
  });
});
