import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { AffinityStateError } from "./affinity_state_error.ts";

describe("AffinityStateError", () => {
  it("uses STATE code", () => {
    const err = new AffinityStateError("cannot edit merged contact");
    strictEqual(err.code, "STATE");
  });
});
