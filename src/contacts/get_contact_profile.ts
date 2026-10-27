import type { AffinityDb } from "../database.ts";
import { getContactJournal } from "../events/get_contact_journal.ts";
import { listOpenCommitments } from "../events/list_open_commitments.ts";
import type { ContactProfileReadOptions } from "../lib/types/contact_profile_read_options.ts";
import type { ContactProfileRecord } from "../lib/types/contact_profile_record.ts";
import { loadContactProfileRecord } from "./load_contact_profile_record.ts";

export function getContactProfile(
  db: AffinityDb,
  contactId: number,
  options?: ContactProfileReadOptions,
): ContactProfileRecord | null {
  const t = options?.topLinksLimit ?? 8;
  const profile = loadContactProfileRecord(db, contactId, t);
  if (!profile) return null;
  const ties = db
    .prepare(`SELECT l.id, l.kind, l.role, c.id AS contactId, c.name
    FROM links l JOIN contacts c ON c.id = CASE WHEN l.from_contact_id = ? THEN l.to_contact_id ELSE l.from_contact_id END
    WHERE l.is_structural = 1 AND l.removed_at IS NULL AND (l.from_contact_id = ? OR l.to_contact_id = ?)
    AND c.deleted_at IS NULL ORDER BY l.id`)
    .all(contactId, contactId, contactId) as {
    id: number;
    kind: string;
    role: string | null;
    contactId: number;
    name: string;
  }[];
  return {
    ...profile,
    recentEvents: getContactJournal(db, contactId, {
      limit: options?.recentEventsLimit ?? 5,
    }).map((event) => ({
      ...event,
      occurredAtIso: new Date(event.occurredAt).toISOString(),
    })),
    openCommitments: listOpenCommitments(
      db,
      { contactId },
      options?.now === undefined ? undefined : { now: options.now },
    ),
    ties,
  };
}
