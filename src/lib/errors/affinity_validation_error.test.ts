import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { AffinityValidationError } from "./affinity_validation_error.ts";

describe("AffinityValidationError", () => {
  it("uses VALIDATION code", () => {
    const err = new AffinityValidationError("limit must be <= 250");
    strictEqual(err.code, "VALIDATION");
  });
});
