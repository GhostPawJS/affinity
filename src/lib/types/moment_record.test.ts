import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { MomentRecord } from "./moment_record.ts";

describe("MomentRecord", () => {
  it("ties an event to a link beat", () => {
    const m: MomentRecord = {
      eventId: 1,
      linkId: 2,
      momentKind: "milestone",
      occurredAt: 9,
      summary: "promotion",
      impactScore: 0.8,
    };
    strictEqual(m.linkId, 2);
  });
});
