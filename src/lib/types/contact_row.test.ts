import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { ContactRow } from "./contact_row.ts";

describe("ContactRow", () => {
  it("mirrors storage layout", () => {
    const row: ContactRow = {
      id: 1,
      name: "A",
      kind: "human",
      lifecycle_state: "active",
      is_owner: 0,
      merged_into_contact_id: null,
      created_at: 0,
      updated_at: 0,
      deleted_at: null,
    };
    strictEqual(row.lifecycle_state, "active");
  });
});
