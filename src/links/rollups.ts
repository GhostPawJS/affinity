import { refreshContactRollup } from "../contacts/rollups.ts";
import type { AffinityDb } from "../database.ts";
import type { OpaqueDerivation } from "../lib/types/derivation_opaque.ts";
import type { OpaqueRollup } from "../lib/types/rollup_opaque.ts";
import {
  bridgeScore,
  driftPriority,
  edgeWeight,
  normalizedRank,
  positiveEventRatio,
  radarScore,
  readinessScore,
  reciprocityScore,
  stateScore,
} from "./mechanics.ts";
import { getLinkRowById } from "./queries.ts";
import type { LinkState } from "./types.ts";

const DAY_MS = 86_400_000;

function parseJsonObject<T extends Record<string, unknown>>(raw: string): T {
  try {
    const parsed = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object"
      ? (parsed as T)
      : ({} as T);
  } catch {
    return {} as T;
  }
}

export function loadLinkRollup(
  db: AffinityDb,
  linkId: number,
): {
  lastEventId: number | null;
  lastMeaningfulEventAt: number | null;
  totalMeaningfulEvents: number;
  positiveMeaningfulEvents: number;
  outboundCount: number;
  inboundCount: number;
  normalizedRank: number;
  reciprocityScore: number;
  recencyScore: number;
  driftPriority: number;
  readinessScore: number;
  radarScore: number;
  edgeWeight: number;
  rollup: OpaqueRollup;
  derivation: OpaqueDerivation;
} | null {
  const row = db
    .prepare(
      `SELECT
         last_event_id,
         last_meaningful_event_at,
         total_meaningful_events,
         positive_meaningful_events,
         outbound_count,
         inbound_count,
         normalized_rank,
         reciprocity_score,
         recency_score,
         drift_priority,
         readiness_score,
         radar_score,
         edge_weight,
         rollup_json,
         derivation_json
       FROM link_rollups
       WHERE link_id = ?`,
    )
    .get(linkId) as
    | {
        last_event_id: number | null;
        last_meaningful_event_at: number | null;
        total_meaningful_events: number;
        positive_meaningful_events: number;
        outbound_count: number;
        inbound_count: number;
        normalized_rank: number;
        reciprocity_score: number;
        recency_score: number;
        drift_priority: number;
        readiness_score: number;
        radar_score: number;
        edge_weight: number;
        rollup_json: string;
        derivation_json: string;
      }
    | undefined;
  if (row === undefined) {
    return null;
  }
  return {
    lastEventId: row.last_event_id,
    lastMeaningfulEventAt: row.last_meaningful_event_at,
    totalMeaningfulEvents: row.total_meaningful_events,
    positiveMeaningfulEvents: row.positive_meaningful_events,
    outboundCount: row.outbound_count,
    inboundCount: row.inbound_count,
    normalizedRank: row.normalized_rank,
    reciprocityScore: row.reciprocity_score,
    recencyScore: row.recency_score,
    driftPriority: row.drift_priority,
    readinessScore: row.readiness_score,
    radarScore: row.radar_score,
    edgeWeight: row.edge_weight,
    rollup: parseJsonObject<OpaqueRollup>(row.rollup_json),
    derivation: parseJsonObject<OpaqueDerivation>(row.derivation_json),
  };
}

function recencyScore(
  occurredAt: number | null,
  cadenceDays: number | null,
  now: number,
): number {
  if (occurredAt === null) {
    return 0;
  }
  const cadence = Math.max(cadenceDays ?? 0, 1);
  const daysSince = Math.max(0, (now - occurredAt) / DAY_MS);
  return Math.max(0, 1 - daysSince / cadence);
}

export function refreshLinkRollup(
  db: AffinityDb,
  linkId: number,
  now: number,
): void {
  const link = getLinkRowById(db, linkId);
  if (!link || link.is_structural !== 0) {
    return;
  }
  const latest = db
    .prepare(
      `SELECT event_id, occurred_at
       FROM link_event_effects
       WHERE link_id = ?
       ORDER BY occurred_at DESC, event_id DESC
       LIMIT 1`,
    )
    .get(linkId) as { event_id: number; occurred_at: number } | undefined;
  const counts = db
    .prepare(
      `SELECT
         COUNT(*) AS total_meaningful_events,
         SUM(CASE WHEN affinity_delta > 0 OR trust_delta > 0 THEN 1 ELSE 0 END) AS positive_meaningful_events
       FROM link_event_effects
       WHERE link_id = ?`,
    )
    .get(linkId) as {
    total_meaningful_events?: number;
    positive_meaningful_events?: number | null;
  };
  const directionalityRows = db
    .prepare(
      `SELECT ep.directionality
       FROM link_event_effects le
       INNER JOIN event_participants ep ON ep.event_id = le.event_id
       WHERE le.link_id = ? AND ep.contact_id = ?
         AND ep.directionality IS NOT NULL`,
    )
    .all(linkId, link.from_contact_id) as {
    directionality:
      | "owner_initiated"
      | "other_initiated"
      | "mutual"
      | "observed";
  }[];
  let outboundCount = 0;
  let inboundCount = 0;
  for (const row of directionalityRows) {
    if (row.directionality === "owner_initiated") {
      outboundCount += 1;
    } else if (row.directionality === "other_initiated") {
      inboundCount += 1;
    } else if (row.directionality === "mutual") {
      outboundCount += 1;
      inboundCount += 1;
    }
  }
  const totalMeaningfulEvents = Number(counts.total_meaningful_events ?? 0);
  const positiveMeaningfulEvents = Number(
    counts.positive_meaningful_events ?? 0,
  );
  const normalizedRankValue = normalizedRank(link.rank ?? 0);
  const recencyScoreValue = recencyScore(
    latest?.occurred_at ?? null,
    link.cadence_days,
    now,
  );
  const daysSinceLastMeaningfulEvent =
    latest === undefined ? 0 : Math.max(0, (now - latest.occurred_at) / DAY_MS);
  const driftPriorityValue = driftPriority({
    daysSinceLastMeaningfulEvent,
    cadenceDays: link.cadence_days ?? 1,
    trust: link.trust ?? 0,
    rank: link.rank ?? 0,
  });
  const readinessScoreValue = readinessScore({
    affinity: link.affinity ?? 0,
    trust: link.trust ?? 0,
    rank: link.rank ?? 0,
  });
  const radarScoreValue = radarScore({
    driftPriority: driftPriorityValue,
    recencyScore: recencyScoreValue,
    rank: link.rank ?? 0,
  });
  const rollupJson = JSON.stringify({
    bridgeScore: bridgeScore(),
    positiveEventRatio: positiveEventRatio(
      positiveMeaningfulEvents,
      totalMeaningfulEvents,
    ),
    stateScore: stateScore((link.state as LinkState | null) ?? null),
  });
  const derivationJson = JSON.stringify({
    normalizedRank: normalizedRankValue,
    reciprocityScore: reciprocityScore(outboundCount, inboundCount),
    recencyScore: recencyScoreValue,
    driftPriority: driftPriorityValue,
  });
  db.prepare(
    `INSERT INTO link_rollups (
       link_id, last_event_id, last_meaningful_event_at, total_meaningful_events,
       positive_meaningful_events, outbound_count, inbound_count, normalized_rank,
       reciprocity_score, recency_score, drift_priority, readiness_score, radar_score,
       edge_weight, rollup_json, derivation_json, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(link_id) DO UPDATE SET
       last_event_id = excluded.last_event_id,
       last_meaningful_event_at = excluded.last_meaningful_event_at,
       total_meaningful_events = excluded.total_meaningful_events,
       positive_meaningful_events = excluded.positive_meaningful_events,
       outbound_count = excluded.outbound_count,
       inbound_count = excluded.inbound_count,
       normalized_rank = excluded.normalized_rank,
       reciprocity_score = excluded.reciprocity_score,
       recency_score = excluded.recency_score,
       drift_priority = excluded.drift_priority,
       readiness_score = excluded.readiness_score,
       radar_score = excluded.radar_score,
       edge_weight = excluded.edge_weight,
       rollup_json = excluded.rollup_json,
       derivation_json = excluded.derivation_json,
       updated_at = excluded.updated_at`,
  ).run(
    linkId,
    latest?.event_id ?? null,
    latest?.occurred_at ?? null,
    totalMeaningfulEvents,
    positiveMeaningfulEvents,
    outboundCount,
    inboundCount,
    normalizedRankValue,
    reciprocityScore(outboundCount, inboundCount),
    recencyScoreValue,
    driftPriorityValue,
    readinessScoreValue,
    radarScoreValue,
    edgeWeight({ trust: link.trust ?? 0, rank: link.rank ?? 0 }),
    rollupJson,
    derivationJson,
    now,
  );
  refreshContactRollup(db, link.from_contact_id, now);
  refreshContactRollup(db, link.to_contact_id, now);
}
