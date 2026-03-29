import type { AffinityDb } from "../database.ts";
import { assertDefaultOrdering } from "../lib/read/assert_default_ordering.ts";
import { resolveListLimitOffset } from "../lib/read/resolve_list_limit_offset.ts";
import type { ContactListItem } from "../lib/types/contact_list_item.ts";
import type { ContactRow } from "../lib/types/contact_row.ts";
import type { ListContactsFilters } from "../lib/types/list_contacts_filters.ts";
import type { AffinityListReadOptions } from "../lib/types/read_list_options.ts";
import { mapContactRowToContactListItem } from "./mappers.ts";

function relevanceScore(
  name: string,
  queryLower: string,
  matchedName: boolean,
  matchedNormalizedIdentity: boolean,
): number {
  const nl = name.toLowerCase();
  if (matchedNormalizedIdentity) return 1.1;
  if (nl.startsWith(queryLower)) return 1.0;
  if (matchedName) return 0.85;
  return 0.7;
}

export function searchContacts(
  db: AffinityDb,
  query: string,
  filters?: ListContactsFilters,
  options?: AffinityListReadOptions,
): ContactListItem[] {
  const q = query.trim();
  if (q.length === 0) {
    return [];
  }
  assertDefaultOrdering("searchContacts", options);
  const { limit, offset } = resolveListLimitOffset(options);
  const queryLower = q.toLowerCase();
  const pattern = `%${q.replace(/%/g, "").replace(/_/g, "")}%`;
  const normalizedPattern = `%${queryLower}%`;
  const clauses: string[] = [
    "c.deleted_at IS NULL",
    "c.lifecycle_state != 'merged'",
  ];
  const params: (string | number)[] = [];
  if (filters?.kind !== undefined) {
    clauses.push("c.kind = ?");
    params.push(filters.kind);
  }
  if (filters?.lifecycleState !== undefined) {
    clauses.push("c.lifecycle_state = ?");
    params.push(filters.lifecycleState);
  }
  if (filters?.includeOwner === false) {
    clauses.push("c.is_owner = 0");
  }
  if (filters?.includeDormant === false || options?.includeDormant === false) {
    clauses.push("c.lifecycle_state != 'dormant'");
  }
  const where = clauses.join(" AND ");
  const sql = `
    SELECT c.id, c.name, c.kind, c.lifecycle_state, c.is_owner, c.merged_into_contact_id,
           c.created_at, c.updated_at, c.deleted_at,
           (
             SELECT value
             FROM identities primary_i
             WHERE primary_i.contact_id = c.id AND primary_i.removed_at IS NULL
             ORDER BY primary_i.id
             LIMIT 1
           ) AS primary_identity,
           MAX(CASE WHEN i.normalized_key LIKE ? THEN 1 ELSE 0 END) AS matched_normalized_identity
    FROM contacts c
    LEFT JOIN identities i ON i.contact_id = c.id AND i.removed_at IS NULL
    WHERE ${where}
      AND (c.name LIKE ? OR i.value LIKE ? OR i.normalized_key LIKE ?)
    GROUP BY c.id
  `;
  const rows = db
    .prepare(sql)
    .all(
      normalizedPattern,
      ...params,
      pattern,
      pattern,
      normalizedPattern,
    ) as unknown as (ContactRow & {
    primary_identity: string | null;
    matched_normalized_identity: number;
  })[];
  const scored = rows.map((r) => {
    const item = mapContactRowToContactListItem(r);
    const matchedName = r.name.toLowerCase().includes(queryLower);
    const score = relevanceScore(
      r.name,
      queryLower,
      matchedName,
      Number(
        (r as { matched_normalized_identity?: number })
          .matched_normalized_identity ?? 0,
      ) > 0,
    );
    return {
      item: {
        ...item,
        primaryIdentity:
          (r as { primary_identity?: string | null }).primary_identity ?? null,
      },
      score,
    };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(offset, offset + limit).map((s) => s.item);
}
