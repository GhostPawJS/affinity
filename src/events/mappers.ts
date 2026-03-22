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
    summary: row.summary,
    significance: row.significance,
    momentKind: row.moment_kind as EventMomentKind | null,
    participants,
  };
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
    summary: row.summary,
    significance: row.significance,
  };
}
