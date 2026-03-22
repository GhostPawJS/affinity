import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { AttributeName } from "./types.ts";

describe("attributes types", () => {
  it("allows attribute keys", () => {
    const n: AttributeName = "priority";
    strictEqual(n, "priority");
  });
});
