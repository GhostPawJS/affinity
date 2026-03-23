import { findOwnerContactId } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import { assertDefaultOrdering } from "../lib/read/assert_default_ordering.ts";
import { resolveListLimitOffset } from "../lib/read/resolve_list_limit_offset.ts";
import type { LinkListItem } from "../lib/types/link_list_item.ts";
import type { LinkListReadFilters } from "../lib/types/link_list_read_filters.ts";
import type { LinkRow } from "../lib/types/link_row.ts";
import type { AffinityListReadOptions } from "../lib/types/read_list_options.ts";
import { mapLinkRowToLinkListItem } from "./mappers.ts";

export function listOwnerSocialLinks(
  db: AffinityDb,
  filters?: LinkListReadFilters,
  options?: AffinityListReadOptions,
): LinkListItem[] {
  assertDefaultOrdering("listOwnerSocialLinks", options);
  const ownerId = findOwnerContactId(db);
  if (ownerId === null) {
    return [];
  }
  const { limit, offset } = resolveListLimitOffset(options);
  const clauses: string[] = [
    "l.removed_at IS NULL",
    "l.is_structural = 0",
    "l.from_contact_id = ?",
  ];
  const params: (string | number)[] = [ownerId];
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
  const where = clauses.join(" AND ");
  const rows = db
    .prepare(
      `SELECT l.id, l.from_contact_id, l.to_contact_id, l.kind, l.role, l.is_structural,
              l.rank, l.affinity, l.trust, l.state, l.cadence_days, l.bond,
              l.created_at, l.updated_at, l.removed_at
       FROM links l
       INNER JOIN contacts c_to ON c_to.id = l.to_contact_id
         AND c_to.deleted_at IS NULL AND c_to.lifecycle_state != 'merged'
       LEFT JOIN link_rollups lr ON lr.link_id = l.id
       WHERE ${where}
       ORDER BY COALESCE(lr.normalized_rank, 0) DESC, l.trust DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as unknown as LinkRow[];
  return rows.map((r) => mapLinkRowToLinkListItem(r));
}
