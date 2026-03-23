import { getContactRowById } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import type { SocialEventInput } from "../lib/types/social_event_input.ts";
import type { EventRecurrenceKind } from "./types.ts";

const PARTICIPANT_ROLES = new Set([
  "actor",
  "recipient",
  "subject",
  "observer",
  "mentioned",
]);
const PARTICIPANT_DIRECTIONALITIES = new Set([
  "owner_initiated",
  "other_initiated",
  "mutual",
  "observed",
]);
const RECURRENCE_KINDS = new Set<string>([
  "birthday",
  "anniversary",
  "renewal",
  "memorial",
  "custom_yearly",
]);

export function assertOwnerParticipates(
  ownerId: number,
  participantIds: readonly number[],
): void {
  if (!participantIds.includes(ownerId)) {
    throw new AffinityValidationError("owner must participate");
  }
}

export function assertParticipantContactsLive(
  db: AffinityDb,
  contactIds: readonly number[],
): void {
  for (const id of contactIds) {
    const row = getContactRowById(db, id);
    if (!row) {
      throw new AffinityNotFoundError("contact not found");
    }
    if (row.lifecycle_state === "merged") {
      throw new AffinityStateError("merged contact is read-only");
    }
  }
}

export function validateSocialEventInput(input: SocialEventInput): void {
  assertFiniteTimestamp(input.occurredAt, "occurredAt");
  const summary = input.summary.trim();
  if (summary.length === 0) {
    throw new AffinityValidationError("summary must be non-empty");
  }
  const sig = input.significance;
  if (!Number.isInteger(sig) || sig < 1 || sig > 10) {
    throw new AffinityValidationError(
      "significance must be an integer from 1 to 10",
    );
  }
  if (input.participants.length === 0) {
    throw new AffinityValidationError("participants must be non-empty");
  }
  const ids = new Set<number>();
  for (const participant of input.participants) {
    if (ids.has(participant.contactId)) {
      throw new AffinityValidationError("duplicate participant contact id");
    }
    ids.add(participant.contactId);
    if (!PARTICIPANT_ROLES.has(participant.role)) {
      throw new AffinityValidationError("invalid participant role");
    }
    if (
      participant.directionality !== undefined &&
      !PARTICIPANT_DIRECTIONALITIES.has(participant.directionality)
    ) {
      throw new AffinityValidationError("invalid participant directionality");
    }
  }
}

export function assertValidRecurrenceKind(
  kind: string,
): kind is EventRecurrenceKind {
  if (!RECURRENCE_KINDS.has(kind)) {
    throw new AffinityValidationError("invalid recurrence kind");
  }
  return true;
}

export function assertFiniteTimestamp(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new AffinityValidationError(
      `${label} must be a finite non-negative number`,
    );
  }
}

const MAX_DAYS_PER_MONTH = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function validateAnchorCalendar(
  anchorMonth: number,
  anchorDay: number,
): void {
  if (!Number.isInteger(anchorMonth) || anchorMonth < 1 || anchorMonth > 12) {
    throw new AffinityValidationError("anchorMonth must be 1..12");
  }
  if (!Number.isInteger(anchorDay) || anchorDay < 1 || anchorDay > 31) {
    throw new AffinityValidationError("anchorDay must be 1..31");
  }
  if (anchorDay > MAX_DAYS_PER_MONTH[anchorMonth]!) {
    throw new AffinityValidationError(
      `anchorDay ${anchorDay} is invalid for month ${anchorMonth}`,
    );
  }
}
