import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { AddDateAnchorInput } from "./add_date_anchor_input.ts";

describe("AddDateAnchorInput", () => {
  it("accepts contact target", () => {
    const input: AddDateAnchorInput = {
      target: { kind: "contact", contactId: 1 },
      recurrenceKind: "anniversary",
      anchorMonth: 6,
      anchorDay: 1,
      summary: "x",
      significance: 7,
    };
    strictEqual(input.target.kind, "contact");
  });
});
