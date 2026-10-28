import type { ListContactsFilters } from "../lib/types/list_contacts_filters.ts";

/** Shared parameterized attribute predicates for contact list and search. */
export function contactAttributeClauses(filters?: ListContactsFilters): {
  clauses: string[];
  params: string[];
} {
  const clauses: string[] = [];
  const params: string[] = [];
  const attributes =
    filters?.attribute === undefined ? [] : [filters.attribute].flat();
  const tags = filters?.tag === undefined ? [] : [filters.tag].flat();
  for (const filter of [
    ...attributes,
    ...tags.map((tag) => `tag:${tag.replace(/^tag:/i, "")}`),
  ]) {
    const separator = filter.indexOf("=");
    const name = separator < 0 ? filter : filter.slice(0, separator);
    clauses.push(`EXISTS (SELECT 1 FROM attributes a WHERE a.contact_id = contacts.id
      AND a.deleted_at IS NULL AND lower(a.name) = lower(?)${separator < 0 ? "" : " AND lower(CAST(CASE WHEN json_valid(a.value) THEN json_extract(a.value, '$') ELSE a.value END AS TEXT)) = lower(?)"})`);
    params.push(name);
    if (separator >= 0) params.push(filter.slice(separator + 1));
  }
  return { clauses, params };
}
