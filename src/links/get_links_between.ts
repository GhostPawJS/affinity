import type { AffinityDb } from "../database.ts";
import type { LinkListItem } from "../lib/types/link_list_item.ts";
import type { LinkRow } from "../lib/types/link_row.ts";
import { linkColumns } from "./columns.ts";
import { mapLinkRowToLinkListItem } from "./mappers.ts";

/**
 * Returns all live links (both relational and structural) between two contacts,
 * in either direction.
 */
export function getLinksBetween(
  db: AffinityDb,
  contactId1: number,
  contactId2: number,
): LinkListItem[] {
  const rows = db
    .prepare(
      `SELECT ${linkColumns()}
       FROM links
       WHERE removed_at IS NULL
         AND (
           (from_contact_id = ? AND to_contact_id = ?)
           OR (from_contact_id = ? AND to_contact_id = ?)
         )
       ORDER BY id ASC`,
    )
    .all(
      contactId1,
      contactId2,
      contactId2,
      contactId1,
    ) as unknown as LinkRow[];
  return rows.map((r) => mapLinkRowToLinkListItem(r));
}
