import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { LinkListItem } from "../lib/types/link_list_item.ts";
import { buildLinkMutationReceipt } from "./receipts.ts";

describe("links receipts", () => {
  it("defaults mechanical fields", () => {
    const primary: LinkListItem = {
      id: 1,
      fromContactId: 1,
      toContactId: 2,
      kind: "works_at",
    };
    const receipt = buildLinkMutationReceipt(primary);
    strictEqual(receipt.derivedEffects.length, 0);
  });
});
