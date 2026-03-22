import { findOwnerContactId } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import { assertDefaultOrdering } from "../lib/read/assert_default_ordering.ts";
import { resolveListLimitOffset } from "../lib/read/resolve_list_limit_offset.ts";
import type { LinkListReadFilters } from "../lib/types/link_list_read_filters.ts";
import type { RadarRecord } from "../lib/types/radar_record.ts";
import type { AffinityListReadOptions } from "../lib/types/read_list_options.ts";

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
  const { limit, offset } = resolveListLimitOffset(options);
  const clauses: string[] = [
    "removed_at IS NULL",
    "is_structural = 0",
    "from_contact_id = ?",
  ];
  const params: (string | number)[] = [ownerId];
  if (filters?.kind !== undefined) {
    clauses.push("kind = ?");
    params.push(filters.kind);
  }
  if (filters?.state !== undefined) {
    clauses.push("state = ?");
    params.push(filters.state);
  }
  if (options?.includeArchived !== true) {
    clauses.push("state != 'archived'");
  }
  if (options?.includeDormant !== true) {
    clauses.push("state != 'dormant'");
  }
  if (options?.includeObserved === false) {
    clauses.push("kind != 'observed'");
  }
  const where = clauses.join(" AND ");
  const rows = db
    .prepare(
      `SELECT
         l.id,
         l.from_contact_id,
         l.to_contact_id,
         l.trust,
         l.rank,
         lr.drift_priority,
         lr.recency_score,
         lr.normalized_rank
       FROM links l
       LEFT JOIN link_rollups lr ON lr.link_id = l.id
       WHERE ${where}
       ORDER BY COALESCE(lr.radar_score, 0) DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as {
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
    driftPriority: row.drift_priority ?? 0,
    recencyScore: row.recency_score ?? 0,
    normalizedRank: row.normalized_rank ?? 0,
    trust: row.trust ?? 0,
    recommendedReason: `trust ${(row.trust ?? 0).toFixed(2)}, rank ${row.rank ?? 0}`,
  }));
}
