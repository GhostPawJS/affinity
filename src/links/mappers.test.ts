import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { LinkRow } from "../lib/types/link_row.ts";
import { mapLinkRowToLinkListItem } from "./mappers.ts";

describe("links mappers", () => {
  it("maps structural rows without progression", () => {
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
    const item = mapLinkRowToLinkListItem(row);
    strictEqual(item.kind, "works_at");
    strictEqual(item.rank, undefined);
  });

  it("maps relational progression", () => {
    const row: LinkRow = {
      id: 1,
      from_contact_id: 1,
      to_contact_id: 2,
      kind: "personal",
      role: null,
      is_structural: 0,
      rank: 0,
      affinity: 0.5,
      trust: 0.5,
      state: "active",
      cadence_days: 7,
      bond: null,
      created_at: 0,
      updated_at: 0,
      removed_at: null,
    };
    const item = mapLinkRowToLinkListItem(row);
    strictEqual(item.rank, 0);
    strictEqual(item.state, "active");
  });
});
