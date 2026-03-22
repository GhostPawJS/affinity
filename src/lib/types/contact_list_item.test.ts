import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { ContactListItem } from "./contact_list_item.ts";

describe("ContactListItem", () => {
  it("supports list defaults without optional rollups", () => {
    const row: ContactListItem = {
      id: 1,
      name: "Ada",
      kind: "human",
      lifecycleState: "active",
      isOwner: false,
    };
    strictEqual(row.primaryIdentity, undefined);
  });
});
