import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { ReviseContactPatch } from "./revise_contact_patch.ts";

describe("ReviseContactPatch", () => {
  it("may rename only", () => {
    const p: ReviseContactPatch = { name: "New" };
    strictEqual(p.name, "New");
  });
});
