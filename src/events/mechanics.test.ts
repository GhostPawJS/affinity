import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  baseWeight,
  damageMultiplier,
  dateSalienceBonus,
  directness,
  intensity,
  intimacyDepth,
  massPenalty,
  novelty,
  positiveTrustFactor,
  preferenceMatch,
  reciprocitySignal,
  reliabilityMatch,
  repairBonus,
  typeWeight,
  valence,
  violationFactor,
  warmthMatch,
} from "./mechanics.ts";

describe("events mechanics", () => {
  it("matches base feature and helper lookup contracts", () => {
    strictEqual(intensity(7), 0.7);
    strictEqual(valence("support"), 0.7);
    strictEqual(intimacyDepth("milestone"), 0.7);
    strictEqual(reciprocitySignal("other_initiated"), 0.75);
    strictEqual(directness({ role: "mentioned" }), 0.25);
    strictEqual(preferenceMatch(2, 1), 1.09);
    strictEqual(Number(novelty(4).toFixed(6)), 0.416667);
    strictEqual(typeWeight("milestone"), 1.35);
    strictEqual(positiveTrustFactor("support"), 0.8);
    strictEqual(violationFactor("promise"), 0.85);
    strictEqual(damageMultiplier("conflict", { category: "betrayal" }), 0.38);
    strictEqual(warmthMatch("transaction"), 0.5);
    strictEqual(reliabilityMatch({ resolution: "broken" }), 0);
  });

  it("matches base weight and protection formulas", () => {
    strictEqual(
      Number(
        baseWeight({
          eventType: "activity",
          significance: 8,
          directness: 1,
          preferenceMatch: 1.12,
          novelty: 0.8,
        }).toFixed(6),
      ),
      0.896448,
    );
    strictEqual(Number(massPenalty(12).toFixed(6)), 0.666667);
    strictEqual(dateSalienceBonus(10), 1.25);
    strictEqual(repairBonus(8), 0.12);
  });
});
