import type { AffinityDb } from "../database.ts";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import type { SocialEventParticipantInput } from "../lib/types/social_event_input.ts";
import { resolveNow } from "../resolve_now.ts";
import { deriveEventSummary } from "./event_metadata.ts";
import { getEventRowById } from "./queries.ts";
import type { EventMomentKind, EventType } from "./types.ts";

export function insertJournalEvent(
  db: AffinityDb,
  params: {
    type: EventType;
    occurredAt: number;
    occurredOn?: string | undefined;
    summary?: string;
    content?: string;
    externalRef?: import("../lib/types/social_event_input.ts").ExternalRef;
    channel?: string;
    parentRef?: import("../lib/types/social_event_input.ts").ExternalRef;
    parentEventId?: number;
    threadRef?: import("../lib/types/social_event_input.ts").ExternalRef;
    provenance?: unknown;
    significance: number;
    momentKind: EventMomentKind | null;
    participants: readonly SocialEventParticipantInput[];
    now?: number;
  },
): number {
  const now = resolveNow(params.now);
  const summary =
    params.summary?.trim() ?? deriveEventSummary(params.content ?? "");
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
  db.prepare("UPDATE events SET declared_moment_kind=? WHERE id=?").run(
    params.momentKind,
    eventId,
  );
  db.prepare(
    "UPDATE events SET content=?, external_source=?, external_id=?, channel=?, parent_source=?, parent_ref_id=?, parent_event_id=?, thread_source=?, thread_id=?, provenance_json=? WHERE id=?",
  ).run(
    params.content ?? null,
    params.externalRef?.source ?? null,
    params.externalRef?.id ?? null,
    params.channel ?? null,
    params.parentRef?.source ?? null,
    params.parentRef?.id ?? null,
    params.parentEventId ?? null,
    params.threadRef?.source ?? null,
    params.threadRef?.id ?? null,
    params.provenance === undefined ? null : JSON.stringify(params.provenance),
    eventId,
  );
  db.prepare("UPDATE events SET occurred_on = ? WHERE id = ?").run(
    params.occurredOn ?? new Date(params.occurredAt).toISOString().slice(0, 10),
    eventId,
  );
  const insertParticipant = db.prepare(
    `INSERT INTO event_participants (
       event_id, contact_id, role, directionality
     ) VALUES (?, ?, ?, ?)`,
  );
  for (const participant of params.participants) {
    insertParticipant.run(
      eventId,
      participant.contactId,
      participant.role,
      participant.directionality ?? null,
    );
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
    occurredOn?: string | undefined;
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
  db.prepare("UPDATE events SET occurred_on = ? WHERE id = ?").run(
    params.occurredOn ?? new Date(params.occurredAt).toISOString().slice(0, 10),
    eventId,
  );
  const insertParticipant = db.prepare(
    `INSERT INTO event_participants (
       event_id, contact_id, role, directionality
     ) VALUES (?, ?, ?, ?)`,
  );
  for (const participant of params.participants) {
    insertParticipant.run(
      eventId,
      participant.contactId,
      participant.role,
      participant.directionality ?? null,
    );
  }
  const row = getEventRowById(db, eventId);
  if (!row) {
    throw new AffinityInvariantError("inserted date anchor not found");
  }
  return eventId;
}
