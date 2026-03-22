import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { CommitmentResolutionState } from "./commitment_resolution_state.ts";

describe("CommitmentResolutionState", () => {
  it("narrows resolution states", () => {
    const s: CommitmentResolutionState = "open";
    strictEqual(s, "open");
  });
});
