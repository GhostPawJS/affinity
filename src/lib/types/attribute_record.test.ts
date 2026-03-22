import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { AttributeRecord } from "./attribute_record.ts";

describe("AttributeRecord", () => {
  it("mirrors SQL exclusivity in types", () => {
    const a: AttributeRecord = {
      id: 1,
      contactId: 2,
      linkId: null,
      name: "x",
      value: "y",
    };
    strictEqual(a.linkId, null);
  });

  it("allows null value", () => {
    const a: AttributeRecord = {
      id: 1,
      contactId: 2,
      linkId: null,
      name: "tag",
      value: null,
    };
    strictEqual(a.value, null);
  });
});
