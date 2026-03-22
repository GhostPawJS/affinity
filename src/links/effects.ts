import type { AffinityDb } from "../database.ts";
import { utcStartOfDayMs } from "../dates/calendar.ts";
import {
  baseWeight,
  damageMultiplier,
  dateSalienceBonus,
  directness,
  intimacyDepth,
  massPenalty,
  novelty,
  positiveTrustFactor,
  preferenceMatch,
  reciprocitySignal,
  reliabilityMatch,
  repairBonus,
  valence,
  violationFactor,
  warmthMatch,
} from "../events/mechanics.ts";
import type { EventType } from "../events/types.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import type { CommitmentResolutionKind } from "../lib/types/commitment_resolution_kind.ts";
import type { DerivedLinkEffect } from "../lib/types/derived_link_effect.ts";
import type { SocialEventParticipantInput } from "../lib/types/social_event_input.ts";
import { baselineCadenceDays, nextCadenceDays } from "./mechanics.ts";
import { getLinkRowById } from "./queries.ts";
import { refreshLinkRollup } from "./rollups.ts";
import type { LinkState, RelationalLinkKind } from "./types.ts";
import { validateRelationalMechanics } from "./validators.ts";

const DAY_MS = 86_400_000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function countSameDaySimilarEvents(
  db: AffinityDb,
  linkId: number,
  eventType: EventType,
  occurredAt: number,
): number {
  const dayStart = utcStartOfDayMs(occurredAt);
  const dayEnd = dayStart + DAY_MS;
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c
       FROM link_event_effects le
       INNER JOIN events e ON e.id = le.event_id
       WHERE le.link_id = ?
         AND e.type = ?
         AND le.occurred_at >= ?
         AND le.occurred_at < ?`,
    )
    .get(linkId, eventType, dayStart, dayEnd) as { c?: number };
  return Number(row.c ?? 0);
}

function weeklyPositiveBaseWeight(
  db: AffinityDb,
  linkId: number,
  occurredAt: number,
): number {
  const weekStart = occurredAt - 7 * DAY_MS;
  const row = db
    .prepare(
      `SELECT SUM(base_weight) AS total
       FROM link_event_effects
       WHERE link_id = ?
         AND occurred_at >= ?
         AND occurred_at <= ?
         AND (affinity_delta > 0 OR trust_delta > 0)`,
    )
    .get(linkId, weekStart, occurredAt) as { total?: number | null };
  return Number(row.total ?? 0);
}

function countRepairContext(
  db: AffinityDb,
  linkId: number,
  occurredAt: number,
): { eligible: boolean; consecutiveRepairEvents: number } {
  const thirtyDaysAgo = occurredAt - 30 * DAY_MS;
  const hasPriorDamage = db
    .prepare(
      `SELECT 1 FROM link_event_effects
       WHERE link_id = ? AND trust_delta < 0
       LIMIT 1`,
    )
    .get(linkId);
  if (hasPriorDamage === undefined) {
    return { eligible: false, consecutiveRepairEvents: 0 };
  }
  const recentNegative = db
    .prepare(
      `SELECT 1 FROM link_event_effects
       WHERE link_id = ? AND trust_delta < 0 AND occurred_at >= ?
       LIMIT 1`,
    )
    .get(linkId, thirtyDaysAgo);
  if (recentNegative !== undefined) {
    return { eligible: false, consecutiveRepairEvents: 0 };
  }
  const repairCount = db
    .prepare(
      `SELECT COUNT(*) AS c FROM link_event_effects
       WHERE link_id = ? AND trust_delta > 0 AND occurred_at >= ?`,
    )
    .get(linkId, thirtyDaysAgo) as { c?: number };
  const count = Number(repairCount.c ?? 0);
  return { eligible: count >= 2, consecutiveRepairEvents: count };
}

function computePreferenceMatch(
  db: AffinityDb,
  linkId: number,
  contactId: number,
  eventType: EventType,
  provenance: unknown,
): number {
  const attrs = db
    .prepare(
      `SELECT name, value FROM attributes
       WHERE deleted_at IS NULL AND name LIKE 'pref.%'
         AND (contact_id = ? OR link_id = ?)`,
    )
    .all(contactId, linkId) as { name: string; value: string | null }[];
  if (attrs.length === 0) {
    return preferenceMatch(0, 0);
  }
  const prefMap = new Map<string, string | null>();
  for (const attr of attrs) {
    prefMap.set(attr.name, attr.value);
  }
  const tags: string[] = [];
  const dimensionMap: Record<string, string> = {
    conversation: "channel",
    activity: "activity",
    gift: "gift",
    support: "support",
  };
  const implicitDimension = dimensionMap[eventType];
  if (implicitDimension !== undefined) {
    tags.push(implicitDimension);
  }
  if (provenance !== null && typeof provenance === "object") {
    for (const [key, val] of Object.entries(
      provenance as Record<string, unknown>,
    )) {
      if (typeof val === "string") {
        tags.push(`${key}.${val}`);
      }
    }
  }
  let liked = 0;
  let disliked = 0;
  for (const tag of tags) {
    const full = `pref.${tag}`;
    const val = prefMap.get(full);
    if (val === undefined) {
      continue;
    }
    const lower = val?.toLowerCase() ?? "";
    if (lower === "disliked" || lower === "0" || lower === "false") {
      disliked += 1;
    } else {
      liked += 1;
    }
  }
  return preferenceMatch(liked, disliked);
}

function computeDateSalienceMultiplier(
  db: AffinityDb,
  contactId: number,
  occurredAt: number,
  significance: number,
): number {
  const windowBefore = 7 * DAY_MS;
  const windowAfter = 2 * DAY_MS;
  const row = db
    .prepare(
      `SELECT 1 FROM upcoming_occurrences uo
       JOIN events e ON e.id = uo.event_id
       LEFT JOIN links l ON l.id = e.anchor_link_id
       WHERE e.deleted_at IS NULL AND e.type = 'date_anchor'
         AND (
           e.anchor_contact_id = ?
           OR l.from_contact_id = ?
           OR l.to_contact_id = ?
         )
         AND uo.occurs_on >= ? AND uo.occurs_on <= ?
       LIMIT 1`,
    )
    .get(
      contactId,
      contactId,
      contactId,
      occurredAt - windowAfter,
      occurredAt + windowBefore,
    );
  if (row !== undefined) {
    return dateSalienceBonus(significance);
  }
  return 1;
}

function isObservedOnlyEvidence(
  eventType: EventType,
  participant: SocialEventParticipantInput,
): boolean {
  return (
    eventType === "observation" || participant.directionality === "observed"
  );
}

function deriveStateAfter(params: {
  stateBefore: LinkState;
  eventType: EventType;
  trustBefore: number;
  trustAfter: number;
  trustDelta: number;
  directness: number;
  eventValence: number;
  provenance?: unknown;
}): LinkState {
  if (params.stateBefore === "archived") {
    throw new AffinityStateError("archived link requires explicit restore");
  }
  if (
    params.eventType === "conflict" &&
    damageMultiplier(params.eventType, params.provenance) >= 0.38
  ) {
    return "broken";
  }
  if (params.eventType === "conflict" || params.trustDelta <= -0.08) {
    return params.trustAfter <= 0.15 ? "broken" : "strained";
  }
  if (
    params.stateBefore === "strained" &&
    params.eventValence > 0 &&
    params.directness >= 0.7 &&
    params.trustAfter > params.trustBefore
  ) {
    return "active";
  }
  if (
    params.stateBefore === "dormant" &&
    params.eventValence > 0 &&
    params.directness >= 0.7
  ) {
    return "active";
  }
  return params.stateBefore;
}

function deriveMomentKind(params: {
  rankBefore: number;
  rankAfter: number;
  stateBefore: LinkState;
  stateAfter: LinkState;
  eventType: EventType;
  significance: number;
  affinityDelta: number;
  trustDelta: number;
}): DerivedLinkEffect["momentKind"] {
  if (params.rankAfter > params.rankBefore) {
    return "breakthrough";
  }
  if (
    params.stateAfter !== params.stateBefore &&
    (params.stateAfter === "strained" || params.stateAfter === "broken")
  ) {
    return "rupture";
  }
  if (
    (params.stateBefore === "strained" || params.stateBefore === "broken") &&
    params.stateAfter === "active"
  ) {
    return "reconciliation";
  }
  if (params.eventType === "milestone" && params.significance >= 7) {
    return "milestone";
  }
  if (
    params.significance >= 8 &&
    (Math.abs(params.affinityDelta) >= 0.45 ||
      Math.abs(params.trustDelta) >= 0.2)
  ) {
    return "turning_point";
  }
  return null;
}

function resolveCommitmentResolution(
  provenance: unknown,
): CommitmentResolutionKind | undefined {
  if (provenance === null || typeof provenance !== "object") {
    return undefined;
  }
  const resolution = (provenance as { commitmentResolution?: unknown })
    .commitmentResolution;
  return resolution === "kept" ||
    resolution === "cancelled" ||
    resolution === "broken"
    ? resolution
    : undefined;
}

export function applyEventEffectToLink(
  db: AffinityDb,
  params: {
    linkId: number;
    eventId: number;
    eventType: EventType;
    occurredAt: number;
    significance: number;
    participant: SocialEventParticipantInput;
    provenance?: unknown;
    now: number;
  },
): DerivedLinkEffect {
  const link = getLinkRowById(db, params.linkId);
  if (!link || link.is_structural !== 0) {
    throw new AffinityStateError("relational link not found");
  }
  const stateBefore = (link.state ?? "active") as LinkState;
  const linkKind = link.kind as RelationalLinkKind;
  const rankBefore = link.rank ?? 0;
  const affinityBefore = link.affinity ?? 0;
  const trustBefore = link.trust ?? 0;
  const cadenceBefore = link.cadence_days ?? baselineCadenceDays(linkKind);
  const commitmentResolution = resolveCommitmentResolution(params.provenance);
  const rawEventValence = valence(params.eventType);
  const eventValence =
    (params.eventType === "promise" || params.eventType === "agreement") &&
    (commitmentResolution === "broken" || commitmentResolution === "cancelled")
      ? 0
      : rawEventValence;
  const eventIntimacyDepth = intimacyDepth(params.eventType);
  const participantDirectness = directness(params.participant);
  const participantReciprocity = reciprocitySignal(
    params.participant.directionality,
  );
  const prefMatch = computePreferenceMatch(
    db,
    params.linkId,
    params.participant.contactId,
    params.eventType,
    params.provenance,
  );
  const noveltyScore = novelty(
    countSameDaySimilarEvents(
      db,
      params.linkId,
      params.eventType,
      params.occurredAt,
    ),
  );
  const base = baseWeight({
    eventType: params.eventType,
    significance: params.significance,
    directness: participantDirectness,
    preferenceMatch: prefMatch,
    novelty: noveltyScore,
  });
  const salienceMultiplier = computeDateSalienceMultiplier(
    db,
    params.participant.contactId,
    params.occurredAt,
    params.significance,
  );
  const weightedBase =
    base *
    massPenalty(
      weeklyPositiveBaseWeight(db, params.linkId, params.occurredAt),
    ) *
    salienceMultiplier;
  const affinityGain =
    weightedBase *
    Math.max(eventValence, 0) *
    (0.55 + 0.45 * eventIntimacyDepth) *
    (0.7 + 0.3 * participantReciprocity) *
    (1 / (1 + 0.22 * rankBefore));
  const affinityLoss = weightedBase * Math.max(-eventValence, 0) * 0.35;
  const affinityMass = clamp(
    affinityBefore + affinityGain - affinityLoss,
    0,
    1.5,
  );
  let rankAfter = rankBefore;
  let affinityAfter = Math.min(0.99, affinityMass);
  if (affinityMass >= 1 && stateBefore === "active") {
    rankAfter = rankBefore + 1;
    affinityAfter = Math.min(0.35, affinityMass - 1);
  }
  if (
    params.participant.role === "mentioned" ||
    isObservedOnlyEvidence(params.eventType, params.participant)
  ) {
    rankAfter = Math.min(rankAfter, 1);
  }
  const reliability =
    params.eventType === "support"
      ? reliabilityMatch({ supportDelivered: true })
      : (params.eventType === "promise" || params.eventType === "agreement") &&
          commitmentResolution !== undefined
        ? reliabilityMatch({ resolution: commitmentResolution })
        : reliabilityMatch();
  const trustFactor =
    (params.eventType === "promise" || params.eventType === "agreement") &&
    commitmentResolution === "cancelled"
      ? 0
      : positiveTrustFactor(params.eventType);
  const trustViolationFactor =
    (params.eventType === "promise" || params.eventType === "agreement") &&
    commitmentResolution !== undefined &&
    commitmentResolution !== "broken"
      ? 0
      : violationFactor(params.eventType, params.provenance);
  const trustGain =
    weightedBase *
    trustFactor *
    (0.6 * warmthMatch(params.eventType, eventValence) + 0.4 * reliability) *
    (1 - trustBefore) *
    0.18;
  const trustLoss =
    weightedBase *
    trustViolationFactor *
    trustBefore *
    damageMultiplier(params.eventType, params.provenance);
  let trustAfter = clamp(trustBefore + trustGain - trustLoss, 0, 1);
  if (
    isObservedOnlyEvidence(params.eventType, params.participant) ||
    params.participant.role === "mentioned"
  ) {
    if (trustBefore < 0.35) {
      trustAfter = Math.min(trustAfter, 0.35);
    } else {
      trustAfter = Math.min(trustAfter, trustBefore);
    }
  }
  const repair = countRepairContext(db, params.linkId, params.occurredAt);
  if (repair.eligible) {
    trustAfter = clamp(
      trustAfter + repairBonus(repair.consecutiveRepairEvents),
      0,
      1,
    );
  }
  const latest = db
    .prepare(
      `SELECT occurred_at
       FROM link_event_effects
       WHERE link_id = ?
       ORDER BY occurred_at DESC, event_id DESC
       LIMIT 1`,
    )
    .get(params.linkId) as { occurred_at: number } | undefined;
  const gapDays =
    latest === undefined
      ? cadenceBefore
      : Math.max(
          1,
          Math.round((params.occurredAt - latest.occurred_at) / DAY_MS),
        );
  const cadenceAfter = nextCadenceDays({
    kind: linkKind,
    currentCadenceDays: cadenceBefore,
    gapDays,
  });
  const stateAfter = deriveStateAfter({
    stateBefore,
    eventType: params.eventType,
    trustBefore,
    trustAfter,
    trustDelta: trustAfter - trustBefore,
    directness: participantDirectness,
    eventValence,
    provenance: params.provenance,
  });
  if (stateBefore !== "active" && rankAfter > rankBefore) {
    rankAfter = rankBefore;
  }
  const affinityDelta = affinityAfter - affinityBefore;
  const trustDelta = trustAfter - trustBefore;
  const momentKind = deriveMomentKind({
    rankBefore,
    rankAfter,
    stateBefore,
    stateAfter,
    eventType: params.eventType,
    significance: params.significance,
    affinityDelta,
    trustDelta,
  });
  validateRelationalMechanics(rankAfter, affinityAfter, trustAfter, stateAfter);
  db.prepare(
    `UPDATE links
     SET rank = ?, affinity = ?, trust = ?, state = ?, cadence_days = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    rankAfter,
    affinityAfter,
    trustAfter,
    stateAfter,
    cadenceAfter,
    params.now,
    params.linkId,
  );
  db.prepare(
    `INSERT INTO link_event_effects (
       event_id, link_id, occurred_at, base_weight, impact_score, moment_kind, directness,
       affinity_delta, trust_delta, rank_delta, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    params.eventId,
    params.linkId,
    params.occurredAt,
    weightedBase,
    weightedBase,
    momentKind,
    participantDirectness,
    affinityDelta,
    trustDelta,
    rankAfter - rankBefore,
    params.now,
    params.now,
  );
  refreshLinkRollup(db, params.linkId, params.now);
  return {
    linkId: params.linkId,
    eventId: params.eventId,
    baseWeight: weightedBase,
    intensity: params.significance / 10,
    valence: eventValence,
    intimacyDepth: eventIntimacyDepth,
    reciprocitySignal: participantReciprocity,
    directness: participantDirectness,
    preferenceMatch: prefMatch,
    novelty: noveltyScore,
    affinityDelta,
    trustDelta,
    rankBefore,
    rankAfter,
    stateBefore,
    stateAfter,
    cadenceBefore,
    cadenceAfter,
    momentKind,
  };
}
