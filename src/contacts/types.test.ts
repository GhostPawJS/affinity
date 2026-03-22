import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { ContactKind, ContactLifecycleState } from "./types.ts";

describe("contacts types", () => {
  it("narrows ContactKind", () => {
    const k: ContactKind = "human";
    strictEqual(k, "human");
  });

  it("narrows ContactLifecycleState", () => {
    const s: ContactLifecycleState = "active";
    strictEqual(s, "active");
  });
});
