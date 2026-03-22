import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { DerivedLinkEffect } from "./derived_link_effect.ts";

describe("DerivedLinkEffect", () => {
  it("accepts a full mechanics row", () => {
    const row: DerivedLinkEffect = {
      linkId: 1,
      eventId: 2,
      baseWeight: 1,
      intensity: 1,
      valence: 0,
      intimacyDepth: 0,
      reciprocitySignal: 0,
      directness: 1,
      preferenceMatch: 0,
      novelty: 0,
      affinityDelta: 0.01,
      trustDelta: 0,
      rankBefore: 0,
      rankAfter: 0,
      stateBefore: "active",
      stateAfter: "active",
      cadenceBefore: null,
      cadenceAfter: 14,
      momentKind: null,
    };
    strictEqual(row.linkId, 1);
  });
});
