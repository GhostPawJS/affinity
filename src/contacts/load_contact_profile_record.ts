import type { AffinityDb } from "../database.ts";
import { loadActiveDatesForContact } from "../dates/upcoming_occurrences.ts";
import { mapIdentityRowToIdentityRecord } from "../identities/mappers.ts";
import type { AttributeEntry } from "../lib/types/attribute_entry.ts";
import type { ContactProfileRecord } from "../lib/types/contact_profile_record.ts";
import type { IdentityRow } from "../lib/types/identity_row.ts";
import type { LinkRow } from "../lib/types/link_row.ts";
import { mapLinkRowToLinkListItem } from "../links/mappers.ts";
import { mapContactRowToContactCore } from "./mappers.ts";
import { getContactRowById } from "./queries.ts";
import { loadContactRollup } from "./rollups.ts";

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
      `SELECT l.id, l.from_contact_id, l.to_contact_id, l.kind, l.role, l.is_structural,
              rank, affinity, trust, state, cadence_days, bond,
              created_at, l.updated_at, removed_at
       FROM links l
       LEFT JOIN link_rollups lr ON lr.link_id = l.id
       WHERE l.is_structural = 0 AND l.removed_at IS NULL
         AND (l.from_contact_id = ? OR l.to_contact_id = ?)
       ORDER BY COALESCE(lr.normalized_rank, 0) DESC, l.trust DESC
       LIMIT ?`,
    )
    .all(contactId, contactId, topLinksLimit) as unknown as LinkRow[];
  const topLinks = linkRows.map((l) => mapLinkRowToLinkListItem(l));
  const activeDates = loadActiveDatesForContact(db, contactId);
  const contactRollup = loadContactRollup(db, contactId);
  return {
    contact: mapContactRowToContactCore(row),
    identities,
    attributes,
    topLinks,
    activeDates,
    warnings: contactRollup?.warnings ?? [],
    rollups: contactRollup?.rollup ?? null,
  };
}
