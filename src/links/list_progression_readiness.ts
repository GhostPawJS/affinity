import { findOwnerContactId } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import { assertDefaultOrdering } from "../lib/read/assert_default_ordering.ts";
import { resolveListLimitOffset } from "../lib/read/resolve_list_limit_offset.ts";
import type { LinkListItem } from "../lib/types/link_list_item.ts";
import type { LinkRow } from "../lib/types/link_row.ts";
import type { AffinityListReadOptions } from "../lib/types/read_list_options.ts";
import { mapLinkRowToLinkListItem } from "./mappers.ts";
import type { LinkKind } from "./types.ts";

export function listProgressionReadiness(
  db: AffinityDb,
  filters?: { kind?: LinkKind },
  options?: AffinityListReadOptions,
): LinkListItem[] {
  assertDefaultOrdering("listProgressionReadiness", options);
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
  const orderedRows = db
    .prepare(
      `SELECT l.id, l.from_contact_id, l.to_contact_id, l.kind, l.role, l.is_structural,
              l.rank, l.affinity, l.trust, l.state, l.cadence_days, l.bond,
              l.created_at, l.updated_at, l.removed_at
       FROM links l
       LEFT JOIN link_rollups lr ON lr.link_id = l.id
       WHERE ${where}
       ORDER BY COALESCE(lr.readiness_score, 0) DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as unknown as LinkRow[];
  return orderedRows.map((row) => mapLinkRowToLinkListItem(row));
}
