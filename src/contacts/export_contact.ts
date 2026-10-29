import type { AffinityDb } from "../database.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";

import { exportRows } from "./export_rows.ts";

/** Export all stored records belonging to a contact, including archived history. */
export function exportContact(db: AffinityDb, id: number) {
  const query = (sql: string, ...params: number[]) =>
    exportRows(db, sql, ...params);
  const contact = query("SELECT * FROM contacts WHERE id = ?", id)[0];
  if (!contact) throw new AffinityNotFoundError("contact not found");
  const events: Array<
    Record<string, unknown> & { participants: Record<string, unknown>[] }
  > = query(
    "SELECT DISTINCT e.*, COALESCE(e.parent_event_id, (SELECT parent.id FROM events parent WHERE parent.external_source=e.parent_source AND parent.external_id=e.parent_ref_id AND parent.deleted_at IS NULL)) AS parent_event_id, CAST(e.content AS BLOB) AS content, CAST(e.summary AS BLOB) AS summary FROM events e JOIN event_participants p ON p.event_id = e.id WHERE p.contact_id = ? AND e.type != 'date_anchor' ORDER BY e.id",
    id,
  ).map((event) => ({
    ...event,
    attributes: query(
      "SELECT * FROM attributes WHERE event_id=? ORDER BY id",
      event.id as number,
    ),
    participants: query(
      "SELECT p.*, c.name AS contact_name FROM event_participants p JOIN contacts c ON c.id = p.contact_id WHERE event_id = ? ORDER BY p.contact_id",
      event.id as number,
    ),
  }));
  return {
    contact,
    identities: query(
      "SELECT * FROM identities WHERE contact_id = ? ORDER BY id",
      id,
    ),
    attributes: query(
      "SELECT * FROM attributes WHERE contact_id = ? OR link_id IN (SELECT id FROM links WHERE from_contact_id = ? OR to_contact_id = ?) ORDER BY id",
      id,
      id,
      id,
    ),
    links: query(
      "SELECT l.*, f.name AS from_contact_name, t.name AS to_contact_name FROM links l JOIN contacts f ON f.id = l.from_contact_id JOIN contacts t ON t.id = l.to_contact_id WHERE from_contact_id = ? OR to_contact_id = ? ORDER BY l.id",
      id,
      id,
    ),
    events,
    commitments: query(
      "SELECT o.* FROM open_commitments o JOIN event_participants p ON p.event_id = o.event_id WHERE p.contact_id = ? ORDER BY o.event_id",
      id,
    ),
    dates: query(
      "SELECT * FROM events WHERE anchor_contact_id = ? OR anchor_link_id IN (SELECT id FROM links WHERE from_contact_id = ? OR to_contact_id = ?) ORDER BY id",
      id,
      id,
      id,
    ),
    mergeHistory: query(
      "SELECT * FROM contact_merges WHERE winner_contact_id = ? OR loser_contact_id = ? ORDER BY id",
      id,
      id,
    ),
  };
}
