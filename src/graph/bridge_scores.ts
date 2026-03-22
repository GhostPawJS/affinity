import { findOwnerContactId } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import { normalizedRank, radarScore, reciprocityScore } from "../links/mechanics.ts";
import { computeNodeBetweenness, normalizeToPercentiles } from "./betweenness.ts";

/**
 * Recompute bridge scores for all relational links by running Brandes
 * betweenness centrality on the active contact graph, then update
 * link_rollups with real bridge_score values and recomputed radar_score.
 */
export function refreshAllBridgeScores(db: AffinityDb, now: number): void {
  const ownerId = findOwnerContactId(db);
  if (ownerId === null) {
    return;
  }

  const linkRows = db
    .prepare(
      `SELECT id, from_contact_id, to_contact_id
       FROM links
       WHERE removed_at IS NULL
         AND is_structural = 0
         AND state != 'archived'`,
    )
    .all() as {
    id: number;
    from_contact_id: number;
    to_contact_id: number;
  }[];

  if (linkRows.length === 0) {
    return;
  }

  const adjacency = new Map<number, number[]>();
  const ensureNode = (id: number) => {
    if (!adjacency.has(id)) {
      adjacency.set(id, []);
    }
  };

  for (const link of linkRows) {
    ensureNode(link.from_contact_id);
    ensureNode(link.to_contact_id);
    adjacency.get(link.from_contact_id)!.push(link.to_contact_id);
    adjacency.get(link.to_contact_id)!.push(link.from_contact_id);
  }

  const rawScores = computeNodeBetweenness(adjacency);
  const percentiles = normalizeToPercentiles(rawScores);

  const rollupRows = db
    .prepare(
      `SELECT
         lr.link_id,
         lr.drift_priority,
         lr.recency_score,
         lr.reciprocity_score,
         l.rank,
         l.from_contact_id,
         l.to_contact_id
       FROM link_rollups lr
       INNER JOIN links l ON l.id = lr.link_id
       WHERE l.removed_at IS NULL AND l.is_structural = 0`,
    )
    .all() as {
    link_id: number;
    drift_priority: number;
    recency_score: number;
    reciprocity_score: number;
    rank: number | null;
    from_contact_id: number;
    to_contact_id: number;
  }[];

  const update = db.prepare(
    `UPDATE link_rollups
     SET bridge_score = ?,
         radar_score = ?,
         rollup_json = json_set(rollup_json, '$.bridgeScore', ?),
         updated_at = ?
     WHERE link_id = ?`,
  );

  for (const row of rollupRows) {
    const counterpartyId =
      row.from_contact_id === ownerId
        ? row.to_contact_id
        : row.from_contact_id;
    const bridgeScoreValue = percentiles.get(counterpartyId) ?? 0.1;
    const newRadar = radarScore({
      driftPriority: row.drift_priority,
      recencyScore: row.recency_score,
      rank: row.rank ?? 0,
      bridgeScore: bridgeScoreValue,
      reciprocityScore: row.reciprocity_score,
    });
    update.run(bridgeScoreValue, newRadar, bridgeScoreValue, now, row.link_id);
  }
}
