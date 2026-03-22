import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  LinkKind,
  LinkState,
  RelationalLinkKind,
  StructuralLinkKind,
} from "./types.ts";

describe("links types", () => {
  it("separates structural and relational kinds", () => {
    const s: StructuralLinkKind = "works_at";
    const r: RelationalLinkKind = "personal";
    const k: LinkKind = s;
    strictEqual(k, "works_at");
    strictEqual(r, "personal");
  });

  it("narrows LinkState", () => {
    const st: LinkState = "active";
    strictEqual(st, "active");
  });
});
