import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import type { EventParticipantView } from "../lib/types/event_participant_view.ts";
import type { EventRecord } from "../lib/types/event_record.ts";
import type { EventRow } from "../lib/types/event_row.ts";
import type { UpcomingDateRecord } from "../lib/types/upcoming_date_record.ts";
import type {
  EventMomentKind,
  EventRecurrenceKind,
  EventType,
} from "./types.ts";
import { assertValidRecurrenceKind } from "./validators.ts";

export function mapEventRowToEventRecord(
  row: EventRow,
  participants: readonly EventParticipantView[],
): EventRecord {
  const base: EventRecord = {
    id: row.id,
    type: row.type as EventType,
    occurredAt: row.occurred_at,
    occurredOn:
      row.occurred_on ?? new Date(row.occurred_at).toISOString().slice(0, 10),
    summary: decodeEventText(row.summary),
    significance: row.significance,
    momentKind: row.moment_kind as EventMomentKind | null,
    participants,
  };
  if (row.content != null) base.content = decodeEventText(row.content);
  if (row.channel != null) base.channel = row.channel;
  if (row.external_source != null && row.external_id != null)
    base.externalRef = { source: row.external_source, id: row.external_id };
  if (row.parent_source != null && row.parent_ref_id != null)
    base.parentRef = { source: row.parent_source, id: row.parent_ref_id };
  if (row.thread_source != null && row.thread_id != null)
    base.threadRef = { source: row.thread_source, id: row.thread_id };
  if (row.parent_event_id != null) base.parentEventId = row.parent_event_id;
  if (row.type === "promise" || row.type === "agreement") {
    base.dueAt = row.due_at ?? null;
    base.dueOn =
      row.due_on ??
      (row.due_at == null
        ? null
        : new Date(row.due_at).toISOString().slice(0, 10));
  }
  if (row.recurrence_kind !== null) {
    base.recurrenceKind = row.recurrence_kind as EventRecurrenceKind;
    base.anchorMonth = row.anchor_month;
    base.anchorDay = row.anchor_day;
  }
  if (row.anchor_contact_id !== null) {
    base.anchorContactId = row.anchor_contact_id;
  }
  if (row.anchor_link_id !== null) {
    base.anchorLinkId = row.anchor_link_id;
  }
  return base;
}

export function mapUpcomingRowToUpcomingDateRecord(row: {
  id: number;
  recurrence_kind: string;
  summary: string;
  significance: number;
  anchor_contact_id: number | null;
  anchor_link_id: number | null;
  occurs_on: number;
}): UpcomingDateRecord {
  assertValidRecurrenceKind(row.recurrence_kind);
  const recurrenceKind = row.recurrence_kind as EventRecurrenceKind;
  let targetRef: UpcomingDateRecord["targetRef"];
  if (row.anchor_contact_id !== null) {
    targetRef = { kind: "contact", id: row.anchor_contact_id };
  } else if (row.anchor_link_id !== null) {
    targetRef = { kind: "link", id: row.anchor_link_id };
  } else {
    throw new AffinityInvariantError("date anchor missing target");
  }
  return {
    anchorEventId: row.id,
    targetRef,
    recurrenceKind,
    occursOn: row.occurs_on,
    occursOnDate: new Date(row.occurs_on).toISOString().slice(0, 10),
    summary: decodeEventText(row.summary),
    significance: row.significance,
  };
}

/** Read byte lengths explicitly because node:sqlite text reads may stop at NUL. */
export function decodeEventText(value: string | Uint8Array): string {
  return typeof value === "string"
    ? value
    : Buffer.from(value).toString("utf8");
}
