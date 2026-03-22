import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { IdentityRow } from "../lib/types/identity_row.ts";
import { mapIdentityRowToIdentityRecord } from "./mappers.ts";

describe("identities mappers", () => {
  it("maps storage flags", () => {
    const row: IdentityRow = {
      id: 1,
      contact_id: 2,
      type: "email",
      value: "a@b",
      label: null,
      normalized_key: "email:a@b",
      verified: 1,
      verified_at: 99,
      created_at: 0,
      updated_at: 0,
      removed_at: null,
    };
    const record = mapIdentityRowToIdentityRecord(row);
    strictEqual(record.verified, true);
    strictEqual(record.verifiedAt, 99);
  });
});
