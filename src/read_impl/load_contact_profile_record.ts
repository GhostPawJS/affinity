import { mapContactRowToContactCore } from "../contacts/mappers.ts";
import { getContactRowById } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import { loadActiveDatesForContact } from "../events/upcoming_occurrences.ts";
import { mapIdentityRowToIdentityRecord } from "../identities/mappers.ts";
import type { AttributeEntry } from "../lib/types/attribute_entry.ts";
import type { ContactProfileRecord } from "../lib/types/contact_profile_record.ts";
import type { IdentityRow } from "../lib/types/identity_row.ts";
import type { LinkRow } from "../lib/types/link_row.ts";
import { mapLinkRowToLinkListItem } from "../links/mappers.ts";

export function loadContactProfileRecord(
  db: AffinityDb,
  contactId: number,
  topLinksLimit: number,
): ContactProfileRecord | null {
  const row = getContactRowById(db, contactId);
  if (!row) {
    return null;
  }
  const identityRows = db
    .prepare(
      `SELECT id, contact_id, type, value, label, normalized_key, verified, verified_at,
              created_at, updated_at, removed_at
       FROM identities WHERE contact_id = ? AND removed_at IS NULL
       ORDER BY id`,
    )
    .all(contactId) as unknown as IdentityRow[];
  const identities = identityRows.map((r) => mapIdentityRowToIdentityRecord(r));
  const attrRows = db
    .prepare(
      `SELECT name, value FROM attributes
       WHERE contact_id = ? AND deleted_at IS NULL
       ORDER BY name`,
    )
    .all(contactId) as { name: string; value: string | null }[];
  const attributes: AttributeEntry[] = attrRows.map((a) => ({
    name: a.name,
    value: a.value,
  }));
  const linkRows = db
    .prepare(
      `SELECT id, from_contact_id, to_contact_id, kind, role, is_structural,
              rank, affinity, trust, state, cadence_days, bond,
              created_at, updated_at, removed_at
       FROM links
       WHERE is_structural = 0 AND removed_at IS NULL
         AND (from_contact_id = ? OR to_contact_id = ?)
       ORDER BY rank DESC, trust DESC
       LIMIT ?`,
    )
    .all(contactId, contactId, topLinksLimit) as unknown as LinkRow[];
  const topLinks = linkRows.map((l) => mapLinkRowToLinkListItem(l));
  const activeDates = loadActiveDatesForContact(db, contactId);
  return {
    contact: mapContactRowToContactCore(row),
    identities,
    attributes,
    topLinks,
    activeDates,
    warnings: [],
    rollups: null,
  };
}
