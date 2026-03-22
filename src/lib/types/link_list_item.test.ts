import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { LinkListItem } from "./link_list_item.ts";

describe("LinkListItem", () => {
  it("allows structural rows without progression", () => {
    const row: LinkListItem = {
      id: 1,
      fromContactId: 1,
      toContactId: 2,
      kind: "works_at",
    };
    strictEqual(row.rank, undefined);
  });
});
