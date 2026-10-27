import type { AffinityDb } from "../database.ts";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import type { EventParticipantView } from "../lib/types/event_participant_view.ts";
import type { EventRecord } from "../lib/types/event_record.ts";
import type { EventRow } from "../lib/types/event_row.ts";
import { mapEventRowToEventRecord } from "./mappers.ts";
import { getEventRowById } from "./queries.ts";
import type { EventParticipantRole } from "./types.ts";

export function loadEventParticipantViews(
  db: AffinityDb,
  eventId: number,
): EventParticipantView[] {
  const rows = db
    .prepare(
      `SELECT contact_id, role, directionality
       FROM event_participants
       WHERE event_id = ?`,
    )
    .all(eventId) as {
    contact_id: number;
    role: string;
    directionality:
      | "owner_initiated"
      | "other_initiated"
      | "mutual"
      | "observed"
      | null;
  }[];
  return rows.map((row) => ({
    contactId: row.contact_id,
    role: row.role as EventParticipantRole,
    ...(row.directionality === null
      ? {}
      : { directionality: row.directionality }),
  }));
}

export function loadEventRecord(db: AffinityDb, eventId: number): EventRecord {
  const row = getEventRowById(db, eventId);
  if (!row) {
    throw new AffinityInvariantError("event not found");
  }
  const participants = loadEventParticipantViews(db, eventId);
  const record = mapEventRowToEventRecord(row, participants);
  const due = db
    .prepare("SELECT due_at, due_on FROM open_commitments WHERE event_id = ?")
    .get(eventId) as
    | { due_at: number | null; due_on: string | null }
    | undefined;
  if (due) {
    record.dueAt = due.due_at;
    record.dueOn =
      due.due_on ??
      (due.due_at === null
        ? null
        : new Date(due.due_at).toISOString().slice(0, 10));
  }
  return record;
}

/** Batch-load EventRecords: 2 queries total (events + participants). */
export function batchLoadEventRecords(
  db: AffinityDb,
  eventIds: readonly number[],
): EventRecord[] {
  if (eventIds.length === 0) {
    return [];
  }
  const ph = eventIds.map(() => "?").join(", ");
  const eventRows = db
    .prepare(
      `SELECT e.id, e.type, e.occurred_at, e.occurred_on, oc.due_at, oc.due_on, summary, significance, moment_kind,
              recurrence_kind, anchor_month, anchor_day,
              anchor_contact_id, anchor_link_id,
              e.created_at, e.updated_at, e.deleted_at
       FROM events e LEFT JOIN open_commitments oc ON oc.event_id = e.id WHERE e.id IN (${ph}) AND e.deleted_at IS NULL`,
    )
    .all(...eventIds) as unknown as EventRow[];
  const partRows = db
    .prepare(
      `SELECT event_id, contact_id, role, directionality
       FROM event_participants WHERE event_id IN (${ph})`,
    )
    .all(...eventIds) as {
    event_id: number;
    contact_id: number;
    role: string;
    directionality:
      | "owner_initiated"
      | "other_initiated"
      | "mutual"
      | "observed"
      | null;
  }[];
  const partsByEvent = new Map<number, EventParticipantView[]>();
  for (const p of partRows) {
    let arr = partsByEvent.get(p.event_id);
    if (!arr) {
      arr = [];
      partsByEvent.set(p.event_id, arr);
    }
    arr.push({
      contactId: p.contact_id,
      role: p.role as EventParticipantRole,
      ...(p.directionality === null
        ? {}
        : { directionality: p.directionality }),
    });
  }
  const rowById = new Map(eventRows.map((r) => [r.id, r]));
  const out: EventRecord[] = [];
  for (const id of eventIds) {
    const row = rowById.get(id);
    if (row) {
      out.push(mapEventRowToEventRecord(row, partsByEvent.get(id) ?? []));
    }
  }
  return out;
}

/** Batch-load participant views for multiple events in one query. */
export function batchLoadEventParticipantViews(
  db: AffinityDb,
  eventIds: readonly number[],
): Map<number, EventParticipantView[]> {
  const result = new Map<number, EventParticipantView[]>();
  if (eventIds.length === 0) {
    return result;
  }
  const ph = eventIds.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `SELECT event_id, contact_id, role, directionality
       FROM event_participants WHERE event_id IN (${ph})`,
    )
    .all(...eventIds) as {
    event_id: number;
    contact_id: number;
    role: string;
    directionality:
      | "owner_initiated"
      | "other_initiated"
      | "mutual"
      | "observed"
      | null;
  }[];
  for (const row of rows) {
    let arr = result.get(row.event_id);
    if (!arr) {
      arr = [];
      result.set(row.event_id, arr);
    }
    arr.push({
      contactId: row.contact_id,
      role: row.role as EventParticipantRole,
      ...(row.directionality === null
        ? {}
        : { directionality: row.directionality }),
    });
  }
  return result;
}

export function requireDateAnchorEvent(
  db: AffinityDb,
  eventId: number,
): EventRow {
  const row = getEventRowById(db, eventId);
  if (!row) {
    throw new AffinityNotFoundError("event not found");
  }
  if (row.type !== "date_anchor") {
    throw new AffinityInvariantError("not a date anchor");
  }
  return row;
}
