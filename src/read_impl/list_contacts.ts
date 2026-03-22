import { mapContactRowToContactListItem } from "../contacts/mappers.ts";
import type { AffinityDb } from "../database.ts";
import type { ContactListItem } from "../lib/types/contact_list_item.ts";
import type { ContactRow } from "../lib/types/contact_row.ts";
import type { ListContactsFilters } from "../lib/types/list_contacts_filters.ts";
import type { AffinityListReadOptions } from "../lib/types/read_list_options.ts";
import { resolveListLimitOffset } from "./resolve_list_limit_offset.ts";

export function listContacts(
  db: AffinityDb,
  filters?: ListContactsFilters,
  options?: AffinityListReadOptions,
): ContactListItem[] {
  const { limit, offset } = resolveListLimitOffset(options);
  const clauses: string[] = [
    "deleted_at IS NULL",
    "lifecycle_state != 'merged'",
  ];
  const params: (string | number)[] = [];
  if (filters?.kind !== undefined) {
    clauses.push("kind = ?");
    params.push(filters.kind);
  }
  if (filters?.lifecycleState !== undefined) {
    clauses.push("lifecycle_state = ?");
    params.push(filters.lifecycleState);
  }
  if (filters?.includeOwner === false) {
    clauses.push("is_owner = 0");
  }
  if (filters?.includeDormant === false) {
    clauses.push("lifecycle_state != 'dormant'");
  }
  const where = clauses.join(" AND ");
  const rows = db
    .prepare(
      `SELECT id, name, kind, lifecycle_state, is_owner, merged_into_contact_id,
              created_at, updated_at, deleted_at
       FROM contacts
       WHERE ${where}
       ORDER BY name ASC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as unknown as ContactRow[];
  return rows.map((r) => {
    const item = mapContactRowToContactListItem(r);
    const primary = db
      .prepare(
        `SELECT value FROM identities
         WHERE contact_id = ? AND removed_at IS NULL
         ORDER BY id LIMIT 1`,
      )
      .get(r.id) as { value: string } | undefined;
    return {
      ...item,
      primaryIdentity: primary?.value ?? null,
    };
  });
}
