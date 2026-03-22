import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import * as attributes from "./index.ts";

describe("attributes barrel", () => {
  it("exports schema init and internal helpers", () => {
    strictEqual(typeof attributes.initAttributesTables, "function");
    strictEqual(typeof attributes.getAttributeRowById, "function");
    strictEqual(typeof attributes.normalizeAttributeValue, "function");
    strictEqual(typeof attributes.buildAttributeMutationReceipt, "function");
  });
});
