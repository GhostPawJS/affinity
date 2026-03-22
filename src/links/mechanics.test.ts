import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  baselineCadenceDays,
  cadenceCeiling,
  cadenceFloor,
  driftPriority,
  driftSeverity,
  edgeWeight,
  nextCadenceDays,
  normalizedRank,
  positiveEventRatio,
  radarScore,
  readinessScore,
  reciprocityScore,
  stateScore,
} from "./mechanics.ts";

describe("links mechanics", () => {
  it("matches the normalized rank, readiness, and edge weight contracts", () => {
    strictEqual(Number(normalizedRank(4).toFixed(6)), 0.632121);
    strictEqual(
      Number(
        readinessScore({ affinity: 0.5, trust: 0.25, rank: 4 }).toFixed(6),
      ),
      0.463212,
    );
    strictEqual(
      Number(edgeWeight({ trust: 0.5, rank: 4 }).toFixed(6)),
      0.426424,
    );
  });

  it("matches the drift, radar, reciprocity, and state contracts", () => {
    strictEqual(driftSeverity(30, 10), 1);
    strictEqual(
      Number(
        driftPriority({
          daysSinceLastMeaningfulEvent: 20,
          cadenceDays: 10,
          trust: 0.5,
          rank: 4,
        }).toFixed(6),
      ),
      0.375712,
    );
    strictEqual(
      Number(
        radarScore({
          driftPriority: 0.375712,
          recencyScore: 0.4,
          rank: 4,
        }).toFixed(6),
      ),
      0.483066,
    );
    strictEqual(reciprocityScore(3, 1), 0.5);
    strictEqual(positiveEventRatio(3, 0), 3);
    strictEqual(stateScore("strained"), 0.3);
  });

  it("matches cadence floor, ceiling, midpoint, and next-step formulas", () => {
    strictEqual(cadenceFloor("personal"), 5);
    strictEqual(cadenceCeiling("personal"), 120);
    strictEqual(baselineCadenceDays("personal"), 63);
    strictEqual(
      nextCadenceDays({
        kind: "personal",
        currentCadenceDays: 63,
        gapDays: 10,
      }),
      50,
    );
  });
});
