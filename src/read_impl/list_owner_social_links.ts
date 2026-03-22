import { findOwnerContactId } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import type { LinkListItem } from "../lib/types/link_list_item.ts";
import type { LinkListReadFilters } from "../lib/types/link_list_read_filters.ts";
import type { LinkRow } from "../lib/types/link_row.ts";
import type { AffinityListReadOptions } from "../lib/types/read_list_options.ts";
import { mapLinkRowToLinkListItem } from "../links/mappers.ts";
import { resolveListLimitOffset } from "./resolve_list_limit_offset.ts";

export function listOwnerSocialLinks(
  db: AffinityDb,
  filters?: LinkListReadFilters,
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
  const where = clauses.join(" AND ");
  const rows = db
    .prepare(
      `SELECT id, from_contact_id, to_contact_id, kind, role, is_structural,
              rank, affinity, trust, state, cadence_days, bond,
              created_at, updated_at, removed_at
       FROM links
       WHERE ${where}
       ORDER BY rank DESC, trust DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as unknown as LinkRow[];
  return rows.map((r) => mapLinkRowToLinkListItem(r));
}
