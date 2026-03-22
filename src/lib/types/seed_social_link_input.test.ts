import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { SeedSocialLinkInput } from "./seed_social_link_input.ts";

describe("SeedSocialLinkInput", () => {
  it("allows optional mechanics", () => {
    const input: SeedSocialLinkInput = {
      fromContactId: 1,
      toContactId: 2,
      kind: "personal",
      rank: 1,
      affinity: 0.2,
      trust: 0.8,
      state: "dormant",
    };
    strictEqual(input.kind, "personal");
  });
});
