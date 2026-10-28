import type { AffinityDb } from "../database.ts";
import { assertDefaultOrdering } from "../lib/read/assert_default_ordering.ts";
import { resolveListLimitOffset } from "../lib/read/resolve_list_limit_offset.ts";
import type { ContactListItem } from "../lib/types/contact_list_item.ts";
import type { ContactRow } from "../lib/types/contact_row.ts";
import type { ListContactsFilters } from "../lib/types/list_contacts_filters.ts";
import type { AffinityListReadOptions } from "../lib/types/read_list_options.ts";
import { contactAttributeClauses } from "./contact_attribute_clauses.ts";
import { foldSearchText } from "./fold_search_text.ts";
import { mapContactRowToContactListItem } from "./mappers.ts";

export function searchContacts(
  db: AffinityDb,
  query: string,
  filters?: ListContactsFilters,
  options?: AffinityListReadOptions,
): ContactListItem[] {
  const q = foldSearchText(query.trim());
  if (!q) return [];
  assertDefaultOrdering("searchContacts", options);
  const { limit, offset } = resolveListLimitOffset(options);
  // Load each searchable relation once, avoiding a query per contact.
  const fields = new Map<number, { text: string; source: string }[]>();
  const rows = db
    .prepare(`
    SELECT contact_id, value || ' ' || normalized_key AS text, 'identity:' || type AS source FROM identities WHERE removed_at IS NULL
    UNION ALL SELECT contact_id, name || ' ' || COALESCE(value, ''), 'attribute:' || name FROM attributes WHERE deleted_at IS NULL AND contact_id IS NOT NULL
    UNION ALL SELECT from_contact_id, COALESCE(role, '') || ' ' || COALESCE(bond, ''), 'link_role' FROM links WHERE removed_at IS NULL
    UNION ALL SELECT to_contact_id, COALESCE(role, '') || ' ' || COALESCE(bond, ''), 'link_role' FROM links WHERE removed_at IS NULL
    UNION ALL SELECT ep.contact_id, e.summary, 'event' FROM event_participants ep JOIN events e ON e.id = ep.event_id WHERE e.deleted_at IS NULL
  `)
    .all() as { contact_id: number; text: string; source: string }[];
  for (const row of rows) {
    const values = fields.get(row.contact_id) ?? [];
    values.push({ text: foldSearchText(row.text), source: row.source });
    fields.set(row.contact_id, values);
  }
  const tokens = q.split(/\s+/);
  const phone = /^[+\d()\-/.\s]+$/.test(q) && q.replace(/\D/g, "").length >= 3;
  const digits = q.replace(/\D/g, "").replace(/^00/, "");
  const suffix = digits.replace(/^0/, "");
  const attributeFilters = contactAttributeClauses(filters);
  const clauses = [
    "deleted_at IS NULL",
    "lifecycle_state != 'merged'",
    ...attributeFilters.clauses,
  ];
  const params: (string | number)[] = [...attributeFilters.params];
  if (filters?.kind !== undefined) {
    clauses.push("kind = ?");
    params.push(filters.kind);
  }
  if (filters?.lifecycleState !== undefined) {
    clauses.push("lifecycle_state = ?");
    params.push(filters.lifecycleState);
  }
  if (filters?.includeOwner === false) clauses.push("is_owner = 0");
  const contacts = (
    db
      .prepare(
        `SELECT id, name, kind, lifecycle_state, is_owner, (SELECT value FROM identities i WHERE i.contact_id = contacts.id AND i.removed_at IS NULL ORDER BY i.id LIMIT 1) AS primary_identity FROM contacts WHERE ${clauses.join(" AND ")}`,
      )
      .all(...params) as (ContactRow & { primary_identity: string | null })[]
  ).map((row) => ({
    ...mapContactRowToContactListItem(row),
    primaryIdentity: row.primary_identity,
  }));
  const scored: { item: ContactListItem; score: number }[] = [];
  for (const contact of contacts) {
    if (
      contact.lifecycleState === "dormant" &&
      !(filters?.includeDormant ?? options?.includeDormant)
    )
      continue;
    if (contact.lifecycleState === "lost" && !filters?.includeLost) continue;
    const name = foldSearchText(contact.name);
    // The owner takes part in nearly every event and link, so only its own
    // name, identities and attributes count as matches.
    const values = [
      { text: name, source: "name" },
      ...(fields.get(contact.id) ?? []).filter(
        (field) =>
          !contact.isOwner ||
          (field.source !== "event" && field.source !== "link_role"),
      ),
    ];
    const phoneFields = phone
      ? values.filter(
          (field) =>
            (field.source === "identity:phone" &&
              field.text
                .split(" ")
                .join("")
                .replace(/[^\d]/g, "")
                .replace(/^00/, "")
                .includes(digits)) ||
            (field.source === "identity:phone" &&
              suffix.length >= 6 &&
              field.text.replace(/\D/g, "").endsWith(suffix)),
        )
      : [];
    if (
      !phoneFields.length &&
      !tokens.every((token) =>
        values.some((field) => field.text.includes(token)),
      )
    )
      continue;
    const matchedOn = [
      ...new Set(
        [
          ...values.filter((field) =>
            tokens.some((token) => field.text.includes(token)),
          ),
          ...phoneFields,
        ].map((field) => field.source),
      ),
    ];
    const identities = values.filter((field) =>
      field.source.startsWith("identity:"),
    );
    const score =
      name === q
        ? 5
        : name.startsWith(q) || tokens.every((token) => name.includes(token))
          ? 4
          : phoneFields.length ||
              identities.some((field) => field.text.split(" ").includes(q))
            ? 3
            : identities.some((field) =>
                  tokens.every((token) => field.text.includes(token)),
                )
              ? 2
              : 1;
    scored.push({ item: { ...contact, matchedOn }, score });
  }
  scored.sort((a, b) => b.score - a.score || a.item.id - b.item.id);
  return scored.slice(offset, offset + limit).map(({ item }) => item);
}
