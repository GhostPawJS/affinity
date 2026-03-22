import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { OpaqueRollup } from "./rollup_opaque.ts";

describe("OpaqueRollup", () => {
  it("accepts structured rollup data", () => {
    const r: OpaqueRollup = { score: 1 };
    strictEqual(r.score, 1);
  });
});
