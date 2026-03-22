import type { AffinityDb } from "../database.ts";
import type { UpcomingDateRecord } from "../lib/types/upcoming_date_record.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";
import { computeNextAnchorOccursOn } from "./calendar.ts";
import { mapUpcomingRowToUpcomingDateRecord } from "./mappers.ts";
import { getEventRowById } from "./queries.ts";

/**
 * Recomputes and stores the next occurrence for a date-anchor event, or no-ops if invalid.
 */
export function upsertUpcomingOccurrence(
  db: AffinityDb,
  eventId: number,
  referenceMs: number,
): void {
  const row = getEventRowById(db, eventId);
  if (!row || row.type !== "date_anchor" || row.deleted_at !== null) {
    return;
  }
  if (
    row.recurrence_kind === null ||
    row.anchor_month === null ||
    row.anchor_day === null
  ) {
    return;
  }
  const occursOn = computeNextAnchorOccursOn({
    anchorMonth: row.anchor_month,
    anchorDay: row.anchor_day,
    referenceMs,
  });
  const stamp = resolveNow();
  db.prepare(
    `INSERT INTO upcoming_occurrences (event_id, occurs_on, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(event_id) DO UPDATE SET
       occurs_on = excluded.occurs_on,
       updated_at = excluded.updated_at`,
  ).run(eventId, occursOn, stamp, stamp);
}

export function deleteUpcomingOccurrence(
  db: AffinityDb,
  eventId: number,
): void {
  db.prepare("DELETE FROM upcoming_occurrences WHERE event_id = ?").run(
    eventId,
  );
}

/**
 * Clears `upcoming_occurrences` and repopulates from all live `date_anchor` events.
 */
export function rebuildUpcomingOccurrences(
  db: AffinityDb,
  options?: { now?: number },
): number {
  return withTransaction(db, () => {
    const referenceMs = resolveNow(options?.now);
    db.exec("DELETE FROM upcoming_occurrences");
    const rows = db
      .prepare(
        `SELECT id FROM events
         WHERE type = 'date_anchor' AND deleted_at IS NULL
           AND recurrence_kind IS NOT NULL
           AND anchor_month IS NOT NULL
           AND anchor_day IS NOT NULL`,
      )
      .all() as { id: number }[];
    let count = 0;
    for (const row of rows) {
      upsertUpcomingOccurrence(db, row.id, referenceMs);
      count += 1;
    }
    return count;
  });
}

export function loadActiveDatesForContact(
  db: AffinityDb,
  contactId: number,
): UpcomingDateRecord[] {
  const rows = db
    .prepare(
      `SELECT e.id, e.recurrence_kind, e.summary, e.significance,
              e.anchor_contact_id, e.anchor_link_id,
              uo.occurs_on
       FROM upcoming_occurrences uo
       JOIN events e ON e.id = uo.event_id
       LEFT JOIN links l ON l.id = e.anchor_link_id
       WHERE e.deleted_at IS NULL AND e.type = 'date_anchor'
         AND (
           e.anchor_contact_id = ?
           OR l.from_contact_id = ?
           OR l.to_contact_id = ?
         )
       ORDER BY uo.occurs_on ASC, e.significance DESC`,
    )
    .all(contactId, contactId, contactId) as unknown as {
    id: number;
    recurrence_kind: string;
    summary: string;
    significance: number;
    anchor_contact_id: number | null;
    anchor_link_id: number | null;
    occurs_on: number;
  }[];
  return rows.map((row) => mapUpcomingRowToUpcomingDateRecord(row));
}
