import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { CommitmentResolutionKind } from "./commitment_resolution_kind.ts";

describe("CommitmentResolutionKind", () => {
  it("allows resolve outcomes", () => {
    const k: CommitmentResolutionKind = "kept";
    strictEqual(k, "kept");
  });
});
