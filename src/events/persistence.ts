import type { AffinityDb } from "../database.ts";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import type { SocialEventParticipantInput } from "../lib/types/social_event_input.ts";
import { resolveNow } from "../resolve_now.ts";
import { getEventRowById } from "./queries.ts";
import type { EventMomentKind, EventType } from "./types.ts";

export function insertJournalEvent(
  db: AffinityDb,
  params: {
    type: EventType;
    occurredAt: number;
    summary: string;
    significance: number;
    momentKind: EventMomentKind | null;
    participants: readonly SocialEventParticipantInput[];
    now?: number;
  },
): number {
  const now = resolveNow(params.now);
  const summary = params.summary.trim();
  const result = db
    .prepare(
      `INSERT INTO events (
         type, occurred_at, summary, significance, moment_kind,
         recurrence_kind, anchor_month, anchor_day,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?)`,
    )
    .run(
      params.type,
      params.occurredAt,
      summary,
      params.significance,
      params.momentKind,
      now,
      now,
    );
  const eventId = Number(result.lastInsertRowid);
  const insertParticipant = db.prepare(
    "INSERT INTO event_participants (event_id, contact_id, role) VALUES (?, ?, ?)",
  );
  for (const participant of params.participants) {
    insertParticipant.run(eventId, participant.contactId, participant.role);
  }
  const row = getEventRowById(db, eventId);
  if (!row) {
    throw new AffinityInvariantError("inserted event not found");
  }
  return eventId;
}

export function insertDateAnchorEvent(
  db: AffinityDb,
  params: {
    occurredAt: number;
    summary: string;
    significance: number;
    recurrenceKind: string;
    anchorMonth: number;
    anchorDay: number;
    anchorContactId: number | null;
    anchorLinkId: number | null;
    participants: readonly SocialEventParticipantInput[];
    now?: number;
  },
): number {
  const now = resolveNow(params.now);
  const summary = params.summary.trim();
  const result = db
    .prepare(
      `INSERT INTO events (
         type, occurred_at, summary, significance, moment_kind,
         recurrence_kind, anchor_month, anchor_day,
         anchor_contact_id, anchor_link_id,
         created_at, updated_at
       ) VALUES ('date_anchor', ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      params.occurredAt,
      summary,
      params.significance,
      params.recurrenceKind,
      params.anchorMonth,
      params.anchorDay,
      params.anchorContactId,
      params.anchorLinkId,
      now,
      now,
    );
  const eventId = Number(result.lastInsertRowid);
  const insertParticipant = db.prepare(
    "INSERT INTO event_participants (event_id, contact_id, role) VALUES (?, ?, ?)",
  );
  for (const participant of params.participants) {
    insertParticipant.run(eventId, participant.contactId, participant.role);
  }
  const row = getEventRowById(db, eventId);
  if (!row) {
    throw new AffinityInvariantError("inserted date anchor not found");
  }
  return eventId;
}
