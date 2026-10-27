import { findOwnerContactId } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import { assertDefaultOrdering } from "../lib/read/assert_default_ordering.ts";
import { resolveListLimitOffset } from "../lib/read/resolve_list_limit_offset.ts";
import type { LinkListReadFilters } from "../lib/types/link_list_read_filters.ts";
import type { RadarRecord } from "../lib/types/radar_record.ts";
import type { AffinityListReadOptions } from "../lib/types/read_list_options.ts";
import { resolveNow } from "../resolve_now.ts";

function deriveRadarReason(
  drift: number,
  recency: number,
  normalizedRank: number,
): string {
  if (drift > 0.5) {
    return "Significantly overdue for contact";
  }
  if (drift > 0.2) {
    return "Drifting — approaching overdue";
  }
  if (recency < 0.3 && normalizedRank > 0.3) {
    return "Important link losing recency";
  }
  if (normalizedRank > 0.5 && recency < 0.5) {
    return "High-rank link needs attention";
  }
  return "Routine check-in recommended";
}

export function listRadar(
  db: AffinityDb,
  filters?: LinkListReadFilters,
  options?: AffinityListReadOptions,
): RadarRecord[] {
  assertDefaultOrdering("listRadar", options);
  const ownerId = findOwnerContactId(db);
  if (ownerId === null) {
    return [];
  }
  const now = resolveNow(options?.now);
  const overdue = `EXISTS (SELECT 1 FROM open_commitments oc JOIN events e ON e.id = oc.event_id JOIN event_participants ep ON ep.event_id = e.id WHERE ep.contact_id = CASE WHEN l.from_contact_id = ${ownerId} THEN l.to_contact_id ELSE l.from_contact_id END AND e.deleted_at IS NULL AND oc.resolved_at IS NULL AND oc.due_at < ${now})`;
  const { limit, offset } = resolveListLimitOffset(options);
  const clauses: string[] = [
    "l.removed_at IS NULL",
    "l.is_structural = 0",
    "(l.from_contact_id = ? OR l.to_contact_id = ?)",
  ];
  const params: (string | number)[] = [ownerId, ownerId];
  if (filters?.kind !== undefined) {
    clauses.push("l.kind = ?");
    params.push(filters.kind);
  }
  if (filters?.state !== undefined) {
    clauses.push("l.state = ?");
    params.push(filters.state);
  }
  if (options?.includeArchived !== true) {
    clauses.push("l.state != 'archived'");
  }
  if (options?.includeDormant !== true) {
    clauses.push("l.state != 'dormant'");
  }
  if (options?.includeObserved === false) {
    clauses.push("l.kind != 'observed'");
  }
  const where = clauses.join(" AND ");
  const rows = db
    .prepare(
      `SELECT
         l.id,
         ${overdue} AS overdue_commitment,
         l.from_contact_id,
         l.to_contact_id,
         l.trust,
         l.rank,
         lr.drift_priority,
         lr.recency_score,
         lr.normalized_rank
       FROM links l
       INNER JOIN contacts c_to ON c_to.id = CASE WHEN l.from_contact_id = ${ownerId} THEN l.to_contact_id ELSE l.from_contact_id END
         AND c_to.deleted_at IS NULL AND c_to.lifecycle_state != 'merged'
       LEFT JOIN link_rollups lr ON lr.link_id = l.id
       WHERE ${where}
       ORDER BY ${overdue} DESC, COALESCE(lr.radar_score, 0) DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as {
    overdue_commitment: number;
    id: number;
    from_contact_id: number;
    to_contact_id: number;
    trust: number | null;
    rank: number | null;
    drift_priority: number | null;
    recency_score: number | null;
    normalized_rank: number | null;
  }[];
  return rows.map((row) => ({
    linkId: row.id,
    contactId:
      row.from_contact_id === ownerId ? row.to_contact_id : row.from_contact_id,
    reasons: row.overdue_commitment ? ["overdue_commitment"] : [],
    driftPriority: row.overdue_commitment
      ? Math.max(1, row.drift_priority ?? 0)
      : (row.drift_priority ?? 0),
    recencyScore: row.recency_score ?? 0,
    normalizedRank: row.normalized_rank ?? 0,
    trust: row.trust ?? 0,
    recommendedReason: deriveRadarReason(
      row.drift_priority ?? 0,
      row.recency_score ?? 0,
      row.normalized_rank ?? 0,
    ),
  }));
}
