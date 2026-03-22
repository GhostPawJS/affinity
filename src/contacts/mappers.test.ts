import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { ContactRow } from "../lib/types/contact_row.ts";
import {
  mapContactRowToContactCore,
  mapContactRowToContactListItem,
} from "./mappers.ts";

describe("contacts mappers", () => {
  it("maps snake_case storage to list item", () => {
    const row: ContactRow = {
      id: 1,
      name: "Ada",
      kind: "human",
      lifecycle_state: "active",
      is_owner: 1,
      merged_into_contact_id: null,
      created_at: 1,
      updated_at: 1,
      deleted_at: null,
    };
    const item = mapContactRowToContactListItem(row);
    strictEqual(item.isOwner, true);
    strictEqual(item.lifecycleState, "active");
  });

  it("keeps core and list item mapping aligned", () => {
    const row: ContactRow = {
      id: 7,
      name: "Orbit",
      kind: "team",
      lifecycle_state: "dormant",
      is_owner: 0,
      merged_into_contact_id: null,
      created_at: 1,
      updated_at: 1,
      deleted_at: null,
    };
    const core = mapContactRowToContactCore(row);
    const item = mapContactRowToContactListItem(row);
    deepStrictEqual(item, core);
  });
});
