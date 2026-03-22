import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { AttributeRecord } from "../lib/types/attribute_record.ts";
import { buildAttributeMutationReceipt } from "./receipts.ts";

describe("attributes receipts", () => {
  it("defaults mechanical fields", () => {
    const primary: AttributeRecord = {
      id: 1,
      contactId: 2,
      linkId: null,
      name: "nickname",
      value: "Ace",
    };
    const receipt = buildAttributeMutationReceipt(primary);
    strictEqual(receipt.affectedLinks.length, 0);
  });
});
