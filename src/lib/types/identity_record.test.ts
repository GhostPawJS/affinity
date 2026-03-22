import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { IdentityRecord } from "./identity_record.ts";

describe("IdentityRecord", () => {
  it("requires core routing fields", () => {
    const row: IdentityRecord = {
      id: 1,
      contactId: 2,
      type: "email",
      value: "a@b",
      label: null,
      verified: false,
    };
    strictEqual(row.verified, false);
  });
});
