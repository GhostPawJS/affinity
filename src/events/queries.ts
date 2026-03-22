import type { AffinityDb } from "../database.ts";
import type { EventRow } from "../lib/types/event_row.ts";

export function getEventRowById(db: AffinityDb, id: number): EventRow | null {
  const row = db
    .prepare(
      `SELECT id, type, occurred_at, summary, significance, moment_kind,
              recurrence_kind, anchor_month, anchor_day,
              anchor_contact_id, anchor_link_id,
              created_at, updated_at, deleted_at
       FROM events
       WHERE id = ? AND deleted_at IS NULL`,
    )
    .get(id);
  if (row === undefined) {
    return null;
  }
  return row as unknown as EventRow;
}

/**
 * Another live `date_anchor` with the same recurrence + calendar + target, or null.
 */
export function findDuplicateDateAnchor(
  db: AffinityDb,
  params: {
    excludeEventId?: number;
    recurrenceKind: string;
    anchorMonth: number;
    anchorDay: number;
    anchorContactId: number | null;
    anchorLinkId: number | null;
  },
): number | null {
  const exclude = params.excludeEventId;
  if (params.anchorContactId !== null) {
    const row = db
      .prepare(
        `SELECT id FROM events
         WHERE type = 'date_anchor' AND deleted_at IS NULL
           AND recurrence_kind = ? AND anchor_month = ? AND anchor_day = ?
           AND anchor_contact_id = ? AND anchor_link_id IS NULL
           AND (? IS NULL OR id != ?)
         LIMIT 1`,
      )
      .get(
        params.recurrenceKind,
        params.anchorMonth,
        params.anchorDay,
        params.anchorContactId,
        exclude ?? null,
        exclude ?? null,
      );
    if (row === undefined) {
      return null;
    }
    return Number((row as { id: number }).id);
  }
  if (params.anchorLinkId !== null) {
    const row = db
      .prepare(
        `SELECT id FROM events
         WHERE type = 'date_anchor' AND deleted_at IS NULL
           AND recurrence_kind = ? AND anchor_month = ? AND anchor_day = ?
           AND anchor_link_id = ? AND anchor_contact_id IS NULL
           AND (? IS NULL OR id != ?)
         LIMIT 1`,
      )
      .get(
        params.recurrenceKind,
        params.anchorMonth,
        params.anchorDay,
        params.anchorLinkId,
        exclude ?? null,
        exclude ?? null,
      );
    if (row === undefined) {
      return null;
    }
    return Number((row as { id: number }).id);
  }
  return null;
}
