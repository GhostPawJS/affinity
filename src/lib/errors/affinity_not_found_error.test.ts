import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { AffinityError } from "./affinity_error.ts";
import { AffinityNotFoundError } from "./affinity_not_found_error.ts";

describe("AffinityNotFoundError", () => {
  it("sets name, message, and code", () => {
    const err = new AffinityNotFoundError("no such contact");
    strictEqual(err.name, "AffinityNotFoundError");
    strictEqual(err.message, "no such contact");
    strictEqual(err.code, "NOT_FOUND");
  });

  it("preserves optional cause", () => {
    const root = new Error("root");
    const err = new AffinityNotFoundError("wrap", { cause: root });
    strictEqual(err.cause, root);
  });

  it("is distinguishable from other AffinityError subclasses", () => {
    const err = new AffinityNotFoundError("x");
    strictEqual(err instanceof AffinityError, true);
    strictEqual(err instanceof AffinityNotFoundError, true);
  });
});
