import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { SetStructuralTieInput } from "./set_structural_tie_input.ts";

describe("SetStructuralTieInput", () => {
  it("allows optional role", () => {
    const input: SetStructuralTieInput = {
      fromContactId: 1,
      toContactId: 2,
      kind: "parent_of",
      role: "legal",
    };
    strictEqual(input.kind, "parent_of");
  });
});
