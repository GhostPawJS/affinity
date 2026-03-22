import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { isRelationalLinkKind, isStructuralLinkKind } from "./kinds.ts";

describe("links kinds", () => {
  it("accepts relational kinds only in relational guard", () => {
    strictEqual(isRelationalLinkKind("personal"), true);
    strictEqual(isRelationalLinkKind("works_at"), false);
  });

  it("accepts structural kinds only in structural guard", () => {
    strictEqual(isStructuralLinkKind("works_at"), true);
    strictEqual(isStructuralLinkKind("personal"), false);
  });
});
