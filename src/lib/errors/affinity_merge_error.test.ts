import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { AffinityMergeError } from "./affinity_merge_error.ts";

describe("AffinityMergeError", () => {
  it("uses MERGE code", () => {
    const err = new AffinityMergeError("cannot merge a contact into itself");
    strictEqual(err.code, "MERGE");
  });
});
