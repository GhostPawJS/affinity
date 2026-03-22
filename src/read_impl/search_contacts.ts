import { mapContactRowToContactListItem } from "../contacts/mappers.ts";
import type { AffinityDb } from "../database.ts";
import type { ContactListItem } from "../lib/types/contact_list_item.ts";
import type { ContactRow } from "../lib/types/contact_row.ts";
import type { ListContactsFilters } from "../lib/types/list_contacts_filters.ts";
import type { AffinityListReadOptions } from "../lib/types/read_list_options.ts";
import { resolveListLimitOffset } from "./resolve_list_limit_offset.ts";

function relevanceScore(
  name: string,
  queryLower: string,
  matchedName: boolean,
): number {
  const nl = name.toLowerCase();
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
  const { limit, offset } = resolveListLimitOffset(options);
  const queryLower = q.toLowerCase();
  const pattern = `%${q.replace(/%/g, "").replace(/_/g, "")}%`;
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
  if (filters?.includeDormant === false) {
    clauses.push("c.lifecycle_state != 'dormant'");
  }
  const where = clauses.join(" AND ");
  const sql = `
    SELECT c.id, c.name, c.kind, c.lifecycle_state, c.is_owner, c.merged_into_contact_id,
           c.created_at, c.updated_at, c.deleted_at
    FROM contacts c
    LEFT JOIN identities i ON i.contact_id = c.id AND i.removed_at IS NULL
    WHERE ${where}
      AND (c.name LIKE ? OR i.value LIKE ?)
  `;
  const rows = db
    .prepare(sql)
    .all(...params, pattern, pattern) as unknown as ContactRow[];
  const byId = new Map<number, ContactRow>();
  for (const r of rows) {
    if (!byId.has(r.id)) {
      byId.set(r.id, r);
    }
  }
  const scored = [...byId.values()].map((r) => {
    const item = mapContactRowToContactListItem(r);
    const matchedName = r.name.toLowerCase().includes(queryLower);
    const score = relevanceScore(r.name, queryLower, matchedName);
    return { item: { ...item, primaryIdentity: null as string | null }, score };
  });
  for (const s of scored) {
    const primary = db
      .prepare(
        `SELECT value FROM identities
         WHERE contact_id = ? AND removed_at IS NULL
         ORDER BY id LIMIT 1`,
      )
      .get(s.item.id) as { value: string } | undefined;
    s.item.primaryIdentity = primary?.value ?? null;
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(offset, offset + limit).map((s) => s.item);
}
