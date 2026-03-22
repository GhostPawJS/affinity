import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { LinkRow } from "./link_row.ts";

describe("LinkRow", () => {
  it("matches storage columns", () => {
    const row: LinkRow = {
      id: 1,
      from_contact_id: 1,
      to_contact_id: 2,
      kind: "works_at",
      role: null,
      is_structural: 1,
      rank: null,
      affinity: null,
      trust: null,
      state: null,
      cadence_days: null,
      bond: null,
      created_at: 0,
      updated_at: 0,
      removed_at: null,
    };
    strictEqual(row.is_structural, 1);
  });
});
