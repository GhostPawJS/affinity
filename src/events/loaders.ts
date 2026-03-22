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
  return mapEventRowToEventRecord(row, participants);
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
