import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { CreateContactInput } from "./create_contact_input.ts";

describe("CreateContactInput", () => {
  it("supports optional owner bootstrap", () => {
    const input: CreateContactInput = {
      name: "Owner",
      kind: "human",
      bootstrapOwner: true,
    };
    strictEqual(input.bootstrapOwner, true);
  });
});
