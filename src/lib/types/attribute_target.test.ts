import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { AttributeTarget } from "./attribute_target.ts";

describe("AttributeTarget", () => {
  it("narrows to contact or link", () => {
    const t: AttributeTarget = { kind: "link", id: 3 };
    strictEqual(t.kind, "link");
  });
});
