import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { MergePrimary } from "./merge_primary.ts";

describe("MergePrimary", () => {
  it("pairs contacts", () => {
    const p: MergePrimary = { winnerContactId: 1, loserContactId: 2 };
    strictEqual(p.winnerContactId, 1);
  });
});
