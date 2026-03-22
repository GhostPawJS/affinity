import type {
  EventMomentKind,
  EventRecurrenceKind,
  EventType,
} from "../../events/types.ts";
import type { EventParticipantView } from "./event_participant_view.ts";

/** Journal entry with explicit participants — CONCEPT.md EventRecord. */
export interface EventRecord {
  id: number;
  type: EventType;
  occurredAt: number;
  summary: string;
  significance: number;
  momentKind: EventMomentKind | null;
  participants: readonly EventParticipantView[];
  recurrenceKind?: EventRecurrenceKind | null;
  anchorMonth?: number | null;
  anchorDay?: number | null;
  anchorContactId?: number | null;
  anchorLinkId?: number | null;
}
