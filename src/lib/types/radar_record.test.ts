import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { RadarRecord } from "./radar_record.ts";

describe("RadarRecord", () => {
  it("exposes ranking factors", () => {
    const r: RadarRecord = {
      linkId: 1,
      contactId: 2,
      driftPriority: 0.5,
      recencyScore: 0.2,
      normalizedRank: 0.3,
      trust: 0.4,
      recommendedReason: "quiet",
    };
    strictEqual(r.recommendedReason, "quiet");
  });
});
