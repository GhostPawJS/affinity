import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { AttributeEntry } from "./attribute_entry.ts";

describe("AttributeEntry", () => {
  it("stores operational metadata as strings", () => {
    const a: AttributeEntry = { name: "pref.channel.text", value: "sms" };
    strictEqual(a.name.includes("pref."), true);
  });

  it("allows null value for presence/tag", () => {
    const a: AttributeEntry = { name: "pref.flag", value: null };
    strictEqual(a.value, null);
  });
});
