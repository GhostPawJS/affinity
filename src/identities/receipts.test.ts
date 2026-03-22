import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { IdentityRecord } from "../lib/types/identity_record.ts";
import { buildIdentityMutationReceipt } from "./receipts.ts";

describe("identities receipts", () => {
  it("defaults mechanical fields", () => {
    const primary: IdentityRecord = {
      id: 1,
      contactId: 2,
      type: "email",
      value: "a@b",
      label: null,
      verified: false,
    };
    const receipt = buildIdentityMutationReceipt(primary);
    strictEqual(receipt.derivedEffects.length, 0);
  });
});
