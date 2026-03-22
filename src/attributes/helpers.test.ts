import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { clearedAttributePrimary } from "./helpers.ts";

describe("attributes helpers", () => {
  it("builds a synthetic cleared primary for contact targets", () => {
    const primary = clearedAttributePrimary({ kind: "contact", id: 7 });
    strictEqual(primary.id, 0);
    strictEqual(primary.contactId, 7);
    strictEqual(primary.linkId, null);
  });
});
