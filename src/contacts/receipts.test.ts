import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { ContactListItem } from "../lib/types/contact_list_item.ts";
import type { MergePrimary } from "../lib/types/merge_primary.ts";
import {
  buildContactMutationReceipt,
  buildMergeMutationReceipt,
} from "./receipts.ts";

describe("contacts receipts", () => {
  it("defaults contact receipt mechanics", () => {
    const primary: ContactListItem = {
      id: 1,
      name: "A",
      kind: "human",
      lifecycleState: "active",
      isOwner: false,
    };
    const receipt = buildContactMutationReceipt(primary);
    strictEqual(receipt.affectedLinks.length, 0);
    strictEqual(receipt.derivedEffects.length, 0);
  });

  it("preserves merge created and removed refs", () => {
    const primary: MergePrimary = {
      winnerContactId: 1,
      loserContactId: 2,
    };
    const receipt = buildMergeMutationReceipt(primary, {
      created: [{ kind: "event", id: 9 }],
      removed: [{ kind: "contact", id: 2 }],
    });
    deepStrictEqual(receipt.created, [{ kind: "event", id: 9 }]);
    deepStrictEqual(receipt.removed, [{ kind: "contact", id: 2 }]);
  });
});
