import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { ContactListItem } from "./contact_list_item.ts";
import type {
  ContactMutationReceipt,
  MutationReceipt,
} from "./mutation_receipt.ts";

describe("MutationReceipt", () => {
  it("specializes primary payloads per domain", () => {
    const primary: ContactListItem = {
      id: 1,
      name: "Ada",
      kind: "human",
      lifecycleState: "active",
      isOwner: false,
    };
    const receipt: MutationReceipt<ContactListItem> = {
      primary,
      created: [{ kind: "contact", id: 1 }],
      updated: [],
      archived: [],
      removed: [],
      affectedLinks: [],
      derivedEffects: [],
    };
    const narrowed: ContactMutationReceipt = receipt;
    strictEqual(narrowed.primary.id, 1);
  });
});
