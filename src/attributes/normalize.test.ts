import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeAttributeValue } from "./normalize.ts";

describe("attributes normalize", () => {
  it("keeps null for tag semantics and trims strings", () => {
    strictEqual(normalizeAttributeValue(null), null);
    strictEqual(normalizeAttributeValue("  value  "), "value");
    strictEqual(normalizeAttributeValue("   "), null);
  });
});
