import { strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { AffinityValidationError } from "./lib/errors/affinity_validation_error.ts";
import { resolveNow } from "./resolve_now.ts";

describe("resolveNow", () => {
  it("returns the explicit timestamp when provided", () => {
    strictEqual(resolveNow(42), 42);
    strictEqual(resolveNow(0), 0);
  });

  it("returns a finite recent time when omitted", () => {
    const t = resolveNow();
    strictEqual(typeof t, "number");
    strictEqual(Number.isFinite(t), true);
    strictEqual(t <= Date.now() + 1, true);
    strictEqual(t >= Date.now() - 60_000, true);
  });

  it("rejects NaN, Infinity, and negative values", () => {
    throws(
      () => resolveNow(Number.NaN),
      (e: unknown) => e instanceof AffinityValidationError,
    );
    throws(
      () => resolveNow(Number.POSITIVE_INFINITY),
      (e: unknown) => e instanceof AffinityValidationError,
    );
    throws(
      () => resolveNow(-1),
      (e: unknown) => e instanceof AffinityValidationError,
    );
  });
});
