import type {
  EventMomentKind,
  EventRecurrenceKind,
  EventType,
} from "../../events/types.ts";
import type { EventParticipantView } from "./event_participant_view.ts";

/** Journal entry with explicit participants — CONCEPT.md EventRecord. */
export interface EventRecord {
  content?: string;
  externalRef?: import("./social_event_input.ts").ExternalRef;
  channel?: string;
  parentRef?: import("./social_event_input.ts").ExternalRef;
  parentEventId?: number;
  threadRef?: import("./social_event_input.ts").ExternalRef;
  attributes?: import("./attribute_record.ts").AttributeRecord[];
  id: number;
  type: EventType;
  occurredAt: number;
  occurredOn?: string;
  dueAt?: number | null;
  dueOn?: string | null;
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
