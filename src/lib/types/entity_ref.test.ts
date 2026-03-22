import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { EntityRef } from "./entity_ref.ts";

describe("EntityRef", () => {
  it("narrows discriminated unions", () => {
    const r: EntityRef = { kind: "contact", id: 1 };
    strictEqual(r.kind, "contact");
    strictEqual(r.id, 1);
  });
});
