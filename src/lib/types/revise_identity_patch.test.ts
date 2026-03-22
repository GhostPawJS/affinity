import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { ReviseIdentityPatch } from "./revise_identity_patch.ts";

describe("ReviseIdentityPatch", () => {
  it("may update routing fields", () => {
    const p: ReviseIdentityPatch = { value: "new@b" };
    strictEqual(p.value, "new@b");
  });
});
