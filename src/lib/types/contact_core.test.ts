import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { ContactCore } from "./contact_core.ts";

describe("ContactCore", () => {
  it("captures identity for profile surfaces", () => {
    const c: ContactCore = {
      id: 1,
      name: "Ada",
      kind: "human",
      lifecycleState: "active",
      isOwner: false,
    };
    strictEqual(c.name, "Ada");
  });
});
