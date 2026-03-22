import { findOwnerContactId } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import type { LinkListReadFilters } from "../lib/types/link_list_read_filters.ts";
import type { LinkRow } from "../lib/types/link_row.ts";
import type { RadarRecord } from "../lib/types/radar_record.ts";
import type { AffinityListReadOptions } from "../lib/types/read_list_options.ts";
import { resolveListLimitOffset } from "./resolve_list_limit_offset.ts";

function radarScore(row: LinkRow): number {
  const trust = row.trust ?? 0;
  const rank = row.rank ?? 0;
  const normalizedRank = Math.min(1, rank / 10);
  const driftPriority = 1 - trust;
  const recencyScore = 0.5;
  return (
    0.55 * driftPriority + 0.25 * (1 - recencyScore) + 0.2 * normalizedRank
  );
}

export function listRadar(
  db: AffinityDb,
  filters?: LinkListReadFilters,
  options?: AffinityListReadOptions,
): RadarRecord[] {
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
      `SELECT id, from_contact_id, to_contact_id, kind, role, is_structural,
              rank, affinity, trust, state, cadence_days, bond,
              created_at, updated_at, removed_at
       FROM links
       WHERE ${where}`,
    )
    .all(...params) as unknown as LinkRow[];
  const scored = rows
    .map((row) => {
      const counterpartyId =
        row.from_contact_id === ownerId
          ? row.to_contact_id
          : row.from_contact_id;
      const trust = row.trust ?? 0;
      const rank = row.rank ?? 0;
      const normalizedRank = Math.min(1, rank / 10);
      return {
        record: {
          linkId: row.id,
          contactId: counterpartyId,
          driftPriority: 1 - trust,
          recencyScore: 0.5,
          normalizedRank,
          trust,
          recommendedReason: `trust ${trust.toFixed(2)}, rank ${rank}`,
        } satisfies RadarRecord,
        score: radarScore(row),
      };
    })
    .sort((a, b) => b.score - a.score);
  return scored.slice(offset, offset + limit).map((s) => s.record);
}
