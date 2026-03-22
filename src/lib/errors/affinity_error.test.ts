import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { AffinityError } from "./affinity_error.ts";
import { AffinityNotFoundError } from "./affinity_not_found_error.ts";

describe("AffinityError", () => {
  it("is the prototype of concrete domain errors", () => {
    const err = new AffinityNotFoundError("missing");
    strictEqual(err instanceof AffinityError, true);
    strictEqual(err instanceof Error, true);
  });
});
