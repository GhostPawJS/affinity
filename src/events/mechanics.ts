import type { CommitmentResolutionKind } from "../lib/types/commitment_resolution_kind.ts";
import type { SocialEventParticipantInput } from "../lib/types/social_event_input.ts";
import type { EventType } from "./types.ts";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** `intensity = significance / 10` — CONCEPT.md. */
export function intensity(significance: number): number {
  return significance / 10;
}

/** `valence` lookup — CONCEPT.md. */
export function valence(eventType: EventType): number {
  switch (eventType) {
    case "conversation":
      return 0.35;
    case "activity":
      return 0.55;
    case "gift":
      return 0.65;
    case "support":
      return 0.7;
    case "milestone":
      return 0.6;
    case "observation":
      return 0.15;
    case "conflict":
      return -0.85;
    case "correction":
      return 0.2;
    case "transaction":
      return 0.1;
    case "promise":
      return 0.25;
    case "agreement":
      return 0.3;
    case "date_anchor":
      return 0;
  }
  return 0;
}

/** `intimacyDepth` lookup — CONCEPT.md. */
export function intimacyDepth(eventType: EventType): number {
  switch (eventType) {
    case "conversation":
      return 0.35;
    case "activity":
      return 0.45;
    case "gift":
      return 0.5;
    case "support":
      return 0.65;
    case "milestone":
      return 0.7;
    case "observation":
      return 0.2;
    case "conflict":
      return 0.8;
    case "correction":
      return 0.55;
    case "transaction":
      return 0.15;
    case "promise":
      return 0.35;
    case "agreement":
      return 0.4;
    case "date_anchor":
      return 0;
  }
}

/** `reciprocitySignal` lookup — CONCEPT.md. */
export function reciprocitySignal(
  directionality: SocialEventParticipantInput["directionality"],
): number {
  switch (directionality) {
    case "mutual":
      return 1;
    case "other_initiated":
      return 0.75;
    case "owner_initiated":
      return 0.65;
    case "observed":
      return 0.35;
    case undefined:
      return 0.5;
  }
}

/** `directness` lookup — CONCEPT.md. */
export function directness(
  participant: Pick<SocialEventParticipantInput, "role" | "directionality">,
): number {
  if (participant.role === "mentioned") {
    return 0.25;
  }
  switch (participant.directionality) {
    case "mutual":
      return 1;
    case "owner_initiated":
      return 0.8;
    case "other_initiated":
      return 0.7;
    case "observed":
      return 0.45;
    case undefined:
      return 0.5;
  }
  return 0.5;
}

/** `preferenceMatch` lookup — CONCEPT.md. */
export function preferenceMatch(
  likedMatches: number,
  dislikedMatches: number,
): number {
  return clamp(1 + 0.12 * likedMatches - 0.15 * dislikedMatches, 0.75, 1.25);
}

/** `novelty` lookup — CONCEPT.md. */
export function novelty(sameDaySimilarEventCount: number): number {
  return Math.max(0.2, 1 / (1 + 0.35 * sameDaySimilarEventCount));
}

/** `type_weight(eventType)` — CONCEPT.md. */
export function typeWeight(eventType: EventType): number {
  switch (eventType) {
    case "conversation":
      return 1;
    case "activity":
      return 1.15;
    case "gift":
      return 1.1;
    case "support":
      return 1.2;
    case "milestone":
      return 1.35;
    case "observation":
      return 0.6;
    case "conflict":
      return 1.25;
    case "correction":
      return 0.9;
    case "transaction":
      return 0.7;
    case "promise":
    case "agreement":
      return 1;
    case "date_anchor":
      return 0;
  }
}

/** `positive_trust_factor(eventType)` — CONCEPT.md. */
export function positiveTrustFactor(eventType: EventType): number {
  switch (eventType) {
    case "conversation":
      return 0.45;
    case "activity":
      return 0.55;
    case "gift":
      return 0.35;
    case "support":
      return 0.8;
    case "milestone":
      return 0.5;
    case "observation":
      return 0.1;
    case "conflict":
      return 0;
    case "correction":
      return 0.6;
    case "transaction":
      return 0.3;
    case "promise":
      return 0.2;
    case "agreement":
      return 0.4;
    case "date_anchor":
      return 0;
  }
}

/** `violation_factor(eventType)` — CONCEPT.md. */
export function violationFactor(
  eventType: EventType,
  provenance?: unknown,
): number {
  if (
    provenance !== null &&
    typeof provenance === "object" &&
    "marksViolation" in provenance &&
    (provenance as { marksViolation?: boolean }).marksViolation === true
  ) {
    return 1;
  }
  switch (eventType) {
    case "conflict":
      return 1;
    case "promise":
      return 0.85;
    case "agreement":
      return 0.9;
    case "correction":
      return 0.2;
    default:
      return 0;
  }
}

/** `damage_multiplier(eventType, provenance)` — CONCEPT.md. */
export function damageMultiplier(
  eventType: EventType,
  provenance?: unknown,
): number {
  const category =
    provenance !== null &&
    typeof provenance === "object" &&
    "category" in provenance
      ? (provenance as { category?: string }).category
      : undefined;
  if (category === "integrity" || category === "betrayal") {
    return 0.38;
  }
  switch (eventType) {
    case "conflict":
      return 0.26;
    case "promise":
    case "agreement":
      return 0.22;
    default:
      return 0;
  }
}

/** `warmth_match` — CONCEPT.md. */
export function warmthMatch(
  eventType: EventType,
  eventValence?: number,
): number {
  if (
    eventType === "gift" ||
    eventType === "support" ||
    eventType === "activity" ||
    eventType === "milestone"
  ) {
    return 1;
  }
  if (
    eventType === "conversation" &&
    (eventValence ?? valence(eventType)) > 0
  ) {
    return 1;
  }
  if (eventType === "transaction") {
    return 0.5;
  }
  if (eventType === "conflict") {
    return 0;
  }
  return 0.35;
}

/** `reliability_match` — CONCEPT.md. */
export function reliabilityMatch(params?: {
  resolution?: CommitmentResolutionKind;
  supportDelivered?: boolean;
}): number {
  if (params?.supportDelivered === true) {
    return 1;
  }
  if (params?.resolution === "kept") {
    return 1;
  }
  if (params?.resolution === "broken") {
    return 0;
  }
  return 0.45;
}

/** `base_weight` — CONCEPT.md. */
export function baseWeight(params: {
  eventType: EventType;
  significance: number;
  directness: number;
  preferenceMatch: number;
  novelty: number;
}): number {
  return (
    typeWeight(params.eventType) *
    (0.35 + 0.65 * intensity(params.significance)) *
    params.directness *
    params.preferenceMatch *
    params.novelty
  );
}

/** Heavy-usage protection — CONCEPT.md. */
export function massPenalty(weeklyPositiveBaseWeight: number): number {
  const excessWeeklyMass = Math.max(0, weeklyPositiveBaseWeight - 8);
  return 1 / (1 + excessWeeklyMass / 8);
}

/** Date salience bonus — CONCEPT.md. */
export function dateSalienceBonus(significance: number): number {
  return 1 + Math.min(0.25, significance / 40);
}

/** Trust repair bonus — CONCEPT.md. */
export function repairBonus(consecutiveRepairEvents: number): number {
  return Math.min(0.12, consecutiveRepairEvents * 0.02);
}
