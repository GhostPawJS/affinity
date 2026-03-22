import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { IdentityRow } from "./identity_row.ts";

describe("IdentityRow", () => {
  it("matches storage columns", () => {
    const row: IdentityRow = {
      id: 1,
      contact_id: 2,
      type: "email",
      value: "a@b",
      label: null,
      normalized_key: "email:a@b",
      verified: 0,
      verified_at: null,
      created_at: 0,
      updated_at: 0,
      removed_at: null,
    };
    strictEqual(row.verified_at, null);
  });
});
