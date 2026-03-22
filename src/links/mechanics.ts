import type { LinkState, RelationalLinkKind } from "./types.ts";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** `normalized_rank = 1 - exp(-rank / 4)` — CONCEPT.md. */
export function normalizedRank(rank: number): number {
  return 1 - Math.exp(-Math.max(0, rank) / 4);
}

/** `state_score` lookup — CONCEPT.md. */
export function stateScore(state: LinkState | null): number {
  switch (state) {
    case "active":
      return 1;
    case "dormant":
      return 0.65;
    case "strained":
      return 0.3;
    case "broken":
      return 0.05;
    case "archived":
    case null:
      return 0;
  }
}

/** `positive_event_ratio` over a trailing window — CONCEPT.md. */
export function positiveEventRatio(
  positiveMeaningfulEvents: number,
  totalMeaningfulEvents: number,
): number {
  return positiveMeaningfulEvents / Math.max(totalMeaningfulEvents, 1);
}

/** `reciprocity_score` over a trailing window — CONCEPT.md. */
export function reciprocityScore(
  outboundCount: number,
  inboundCount: number,
): number {
  const total = outboundCount + inboundCount;
  const imbalance = Math.abs(outboundCount - inboundCount);
  return 1 - Math.min(1, imbalance / Math.max(total, 1));
}

/** `readiness = 0.70 * affinity + 0.20 * trust + 0.10 * normalized_rank`. */
export function readinessScore(params: {
  affinity: number;
  trust: number;
  rank: number;
}): number {
  return (
    0.7 * params.affinity +
    0.2 * params.trust +
    0.1 * normalizedRank(params.rank)
  );
}

/** `edge_weight = trust * (0.6 + 0.4 * normalized_rank)`. */
export function edgeWeight(params: { trust: number; rank: number }): number {
  return params.trust * (0.6 + 0.4 * normalizedRank(params.rank));
}

/** Drift severity is zero until cadence is exceeded; strong near 3x cadence. */
export function driftSeverity(
  daysSinceLastMeaningfulEvent: number,
  cadenceDays: number,
): number {
  const driftRatio = daysSinceLastMeaningfulEvent / Math.max(cadenceDays, 1);
  return clamp((driftRatio - 1) / 2, 0, 1);
}

/** `drift_priority` formula — CONCEPT.md. */
export function driftPriority(params: {
  daysSinceLastMeaningfulEvent: number;
  cadenceDays: number;
  trust: number;
  rank: number;
}): number {
  const severity = driftSeverity(
    params.daysSinceLastMeaningfulEvent,
    params.cadenceDays,
  );
  return (
    severity * (0.45 + 0.35 * params.trust + 0.2 * normalizedRank(params.rank))
  );
}

/** `radar_score = 0.55 * drift_priority + 0.25 * (1 - recency_score) + 0.20 * normalized_rank`. */
export function radarScore(params: {
  driftPriority: number;
  recencyScore: number;
  rank: number;
}): number {
  return (
    0.55 * params.driftPriority +
    0.25 * (1 - params.recencyScore) +
    0.2 * normalizedRank(params.rank)
  );
}

/** `bridge_score` fallback when graph percentile is unavailable. */
export function bridgeScore(): number {
  return 0.1;
}

/** `cadence_floor(kind)` lookup — CONCEPT.md. */
export function cadenceFloor(kind: RelationalLinkKind): number {
  switch (kind) {
    case "family":
      return 3;
    case "personal":
    case "professional":
      return 5;
    case "romantic":
      return 2;
    case "care":
      return 3;
    case "service":
    case "observed":
      return 30;
    case "other_relational":
      return 14;
  }
}

/** `cadence_ceiling(kind)` lookup — CONCEPT.md. */
export function cadenceCeiling(kind: RelationalLinkKind): number {
  switch (kind) {
    case "family":
      return 60;
    case "personal":
      return 120;
    case "professional":
    case "care":
      return 90;
    case "romantic":
      return 45;
    case "service":
    case "observed":
      return 365;
    case "other_relational":
      return 180;
  }
}

/** Baseline cadence midpoint — CONCEPT.md cadence formula. */
export function baselineCadenceDays(kind: RelationalLinkKind): number {
  return Math.round((cadenceFloor(kind) + cadenceCeiling(kind)) / 2);
}

/** Next cadence after observing a real gap between meaningful events. */
export function nextCadenceDays(params: {
  kind: RelationalLinkKind;
  currentCadenceDays: number;
  gapDays: number;
}): number {
  return Math.round(
    clamp(
      0.75 * params.currentCadenceDays + 0.25 * params.gapDays,
      cadenceFloor(params.kind),
      cadenceCeiling(params.kind),
    ),
  );
}
