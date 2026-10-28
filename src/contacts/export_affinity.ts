import type { AffinityDb } from "../database.ts";
import { exportContact } from "./export_contact.ts";
import { exportRows } from "./export_rows.ts";

/** Export every contact, including merged and lost records. Version is the export format version. */
export function exportAffinity(db: AffinityDb) {
  const now = Date.now();
  const records = (
    db.prepare("SELECT id FROM contacts ORDER BY id").all() as { id: number }[]
  ).map((row) => exportContact(db, row.id));
  const events: Array<
    Record<string, unknown> & { participants: Record<string, unknown>[] }
  > = exportRows(db, "SELECT * FROM events ORDER BY id").map((event) => ({
    ...event,
    participants: exportRows(
      db,
      "SELECT p.contact_id, p.role, c.name AS contact_name FROM event_participants p JOIN contacts c ON c.id = p.contact_id WHERE p.event_id = ? ORDER BY p.contact_id",
      event.id as number,
    ),
  }));
  return {
    version: 1,
    exportedAt: now,
    exportedAtIso: new Date(now).toISOString(),
    events,
    contacts: records.map(({ events, dates, ...record }) => ({
      ...record,
      eventIds: events.map((event) => event.id),
      dateIds: dates.map((date) => date.id),
    })),
  };
}
