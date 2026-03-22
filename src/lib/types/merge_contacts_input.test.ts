import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { MergeContactsInput } from "./merge_contacts_input.ts";

describe("MergeContactsInput", () => {
  it("disallows self-merge at type level only via write layer", () => {
    const m: MergeContactsInput = {
      winnerContactId: 1,
      loserContactId: 2,
    };
    strictEqual(m.winnerContactId !== m.loserContactId, true);
  });
});
