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

it("keeps event lookup weights consistent across all supported event types", () => {
  const rows = [
    ["conversation", 0.35, 0.35, 1, 0.45],
    ["activity", 0.55, 0.45, 1.15, 0.55],
    ["gift", 0.65, 0.5, 1.1, 0.35],
    ["support", 0.7, 0.65, 1.2, 0.8],
    ["milestone", 0.6, 0.7, 1.35, 0.5],
    ["observation", 0.15, 0.2, 0.6, 0.1],
    ["conflict", -0.85, 0.8, 1.25, 0],
    ["correction", 0.2, 0.55, 0.9, 0.6],
    ["transaction", 0.1, 0.15, 0.7, 0.3],
    ["promise", 0.25, 0.35, 1, 0.2],
    ["agreement", 0.3, 0.4, 1, 0.4],
    ["date_anchor", 0, 0, 0, 0],
  ] as const;
  for (const [type, v, depth, weight, trust] of rows) {
    strictEqual(valence(type), v);
    strictEqual(intimacyDepth(type), depth);
    strictEqual(typeWeight(type), weight);
    strictEqual(positiveTrustFactor(type), trust);
  }
});

it("distinguishes directionality, violation provenance and optional reliability signals", () => {
  for (const [directionality, reciprocity, direct] of [
    ["mutual", 1, 1],
    ["owner_initiated", 0.65, 0.8],
    ["other_initiated", 0.75, 0.7],
    ["observed", 0.35, 0.45],
    [undefined, 0.5, 0.5],
  ] as const) {
    strictEqual(reciprocitySignal(directionality), reciprocity);
    strictEqual(
      directness(
        directionality === undefined
          ? { role: "actor" }
          : { role: "actor", directionality },
      ),
      direct,
    );
  }
  for (const provenance of [
    undefined,
    null,
    "text",
    {},
    { marksViolation: false },
  ]) {
    strictEqual(violationFactor("conversation", provenance), 0);
    strictEqual(damageMultiplier("conversation", provenance), 0);
  }
  strictEqual(violationFactor("conversation", { marksViolation: true }), 1);
  strictEqual(violationFactor("agreement"), 0.9);
  strictEqual(violationFactor("correction"), 0.2);
  strictEqual(damageMultiplier("promise"), 0.22);
  strictEqual(damageMultiplier("agreement"), 0.22);
  strictEqual(damageMultiplier("conflict"), 0.26);
  strictEqual(
    damageMultiplier("conversation", { category: "integrity" }),
    0.38,
  );
  strictEqual(damageMultiplier("conversation", { category: "other" }), 0);
  strictEqual(warmthMatch("conversation", -1), 0.35);
  strictEqual(warmthMatch("gift"), 1);
  strictEqual(warmthMatch("support"), 1);
  strictEqual(warmthMatch("activity"), 1);
  strictEqual(warmthMatch("milestone"), 1);
  strictEqual(reliabilityMatch(), 0.45);
  strictEqual(
    reliabilityMatch({ supportDelivered: true, resolution: "broken" }),
    1,
  );
  strictEqual(reliabilityMatch({ resolution: "kept" }), 1);
});
