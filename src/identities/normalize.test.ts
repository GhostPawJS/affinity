import { strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import { normalizeIdentityKey } from "./normalize.ts";

describe("normalizeIdentityKey", () => {
  it("lower-cases and joins type:value", () => {
    strictEqual(normalizeIdentityKey(" Email ", " A@B "), "email:a@b");
  });

  it("rejects empty segments", () => {
    throws(
      () => normalizeIdentityKey("", "x"),
      (error: unknown) => error instanceof AffinityValidationError,
    );
  });
});
