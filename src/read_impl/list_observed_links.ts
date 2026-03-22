import type { AffinityDb } from "../database.ts";
import type { LinkListItem } from "../lib/types/link_list_item.ts";
import type { LinkListReadFilters } from "../lib/types/link_list_read_filters.ts";
import type { LinkRow } from "../lib/types/link_row.ts";
import type { AffinityListReadOptions } from "../lib/types/read_list_options.ts";
import { mapLinkRowToLinkListItem } from "../links/mappers.ts";
import { resolveListLimitOffset } from "./resolve_list_limit_offset.ts";

export function listObservedLinks(
  db: AffinityDb,
  filters?: LinkListReadFilters,
  options?: AffinityListReadOptions,
): LinkListItem[] {
  const { limit, offset } = resolveListLimitOffset(options);
  const clauses: string[] = [
    "removed_at IS NULL",
    "is_structural = 0",
    "kind = 'observed'",
  ];
  const params: (string | number)[] = [];
  if (filters?.state !== undefined) {
    clauses.push("state = ?");
    params.push(filters.state);
  }
  if (options?.includeArchived !== true) {
    clauses.push("state != 'archived'");
  }
  const where = clauses.join(" AND ");
  const rows = db
    .prepare(
      `SELECT id, from_contact_id, to_contact_id, kind, role, is_structural,
              rank, affinity, trust, state, cadence_days, bond,
              created_at, updated_at, removed_at
       FROM links
       WHERE ${where}
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as unknown as LinkRow[];
  return rows.map((r) => mapLinkRowToLinkListItem(r));
}
