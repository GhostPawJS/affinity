/** Journal entry classification — CONCEPT.md `events.type`. */
export type EventType =
  | "conversation"
  | "activity"
  | "gift"
  | "support"
  | "milestone"
  | "observation"
  | "conflict"
  | "correction"
  | "transaction"
  | "promise"
  | "agreement"
  | "date_anchor";

/** Derived key beat — CONCEPT.md `events.moment_kind` (nullable in storage). */
export type EventMomentKind =
  | "breakthrough"
  | "rupture"
  | "reconciliation"
  | "milestone"
  | "turning_point";

/** Anchored calendar recurrence — CONCEPT.md recurring fields on `events`. */
export type EventRecurrenceKind =
  | "birthday"
  | "anniversary"
  | "renewal"
  | "memorial"
  | "custom_yearly";

/** Participant stance — CONCEPT.md `event_participants.role`. */
export type EventParticipantRole =
  | "actor"
  | "recipient"
  | "subject"
  | "observer"
  | "mentioned";
