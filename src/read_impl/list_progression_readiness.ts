import { findOwnerContactId } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import type { LinkListItem } from "../lib/types/link_list_item.ts";
import type { LinkRow } from "../lib/types/link_row.ts";
import type { AffinityListReadOptions } from "../lib/types/read_list_options.ts";
import { mapLinkRowToLinkListItem } from "../links/mappers.ts";
import type { LinkKind } from "../links/types.ts";
import { resolveListLimitOffset } from "./resolve_list_limit_offset.ts";

function readinessScore(row: LinkRow): number {
  const aff = row.affinity ?? 0;
  const trust = row.trust ?? 0;
  const rank = row.rank ?? 0;
  const normalizedRank = Math.min(1, rank / 10);
  return 0.7 * aff + 0.2 * trust + 0.1 * normalizedRank;
}

export function listProgressionReadiness(
  db: AffinityDb,
  filters?: { kind?: LinkKind },
  options?: AffinityListReadOptions,
): LinkListItem[] {
  const ownerId = findOwnerContactId(db);
  if (ownerId === null) {
    return [];
  }
  const { limit, offset } = resolveListLimitOffset(options);
  const clauses: string[] = [
    "removed_at IS NULL",
    "is_structural = 0",
    "from_contact_id = ?",
    "state = 'active'",
  ];
  const params: (string | number)[] = [ownerId];
  if (filters?.kind !== undefined) {
    clauses.push("kind = ?");
    params.push(filters.kind);
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
    .map((r) => ({ row: r, score: readinessScore(r) }))
    .sort((a, b) => b.score - a.score);
  return scored
    .slice(offset, offset + limit)
    .map((s) => mapLinkRowToLinkListItem(s.row));
}
