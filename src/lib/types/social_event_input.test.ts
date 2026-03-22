import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { SocialEventInput } from "./social_event_input.ts";

describe("SocialEventInput", () => {
  it("carries participant roster", () => {
    const input: SocialEventInput = {
      occurredAt: 1,
      summary: "coffee",
      significance: 3,
      participants: [{ contactId: 2, role: "actor" }],
    };
    strictEqual(input.participants.length, 1);
  });
});
