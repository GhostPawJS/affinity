import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { ContactProfileRecord } from "./contact_profile_record.ts";

describe("ContactProfileRecord", () => {
  it("requires nested collections (possibly empty)", () => {
    const p: ContactProfileRecord = {
      contact: {
        id: 1,
        name: "Ada",
        kind: "human",
        lifecycleState: "active",
        isOwner: false,
      },
      identities: [],
      attributes: [],
      topLinks: [],
      activeDates: [],
      warnings: [],
    };
    strictEqual(p.warnings.length, 0);
  });
});
