import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { IdentityType } from "./types.ts";

describe("identities types", () => {
  it("allows routing labels", () => {
    const t: IdentityType = "email";
    strictEqual(t, "email");
  });
});
