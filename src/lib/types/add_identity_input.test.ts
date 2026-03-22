import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { AddIdentityInput } from "./add_identity_input.ts";

describe("AddIdentityInput", () => {
  it("accepts optional label and verified", () => {
    const input: AddIdentityInput = {
      type: "email",
      value: "a@b",
      label: "work",
      verified: true,
    };
    strictEqual(input.verified, true);
  });
});
