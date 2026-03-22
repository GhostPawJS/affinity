import type { AffinityDb } from "../database.ts";
import { loadEventRecord } from "../events/loaders.ts";
import { insertDateAnchorEvent } from "../events/persistence.ts";
import { findDuplicateDateAnchor } from "../events/queries.ts";
import { buildEventMutationReceipt } from "../events/receipts.ts";
import {
  assertParticipantContactsLive,
  assertValidRecurrenceKind,
  validateAnchorCalendar,
} from "../events/validators.ts";
import { AffinityConflictError } from "../lib/errors/affinity_conflict_error.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import type { AddDateAnchorInput } from "../lib/types/add_date_anchor_input.ts";
import type { EventMutationReceipt } from "../lib/types/mutation_receipt.ts";
import type { SocialEventParticipantInput } from "../lib/types/social_event_input.ts";
import { getLinkRowById } from "../links/queries.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";
import { upsertUpcomingOccurrence } from "./upcoming_occurrences.ts";

export function addDateAnchor(
  db: AffinityDb,
  input: AddDateAnchorInput,
): EventMutationReceipt {
  return withTransaction(db, () => {
    assertValidRecurrenceKind(input.recurrenceKind);
    validateAnchorCalendar(input.anchorMonth, input.anchorDay);
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
    let anchorContactId: number | null = null;
    let anchorLinkId: number | null = null;
    let participants: readonly SocialEventParticipantInput[];
    if (input.target.kind === "contact") {
      anchorContactId = input.target.contactId;
      assertParticipantContactsLive(db, [anchorContactId]);
      participants = [{ contactId: anchorContactId, role: "subject" }];
    } else {
      anchorLinkId = input.target.linkId;
      const link = getLinkRowById(db, anchorLinkId);
      if (!link) {
        throw new AffinityNotFoundError("link not found");
      }
      assertParticipantContactsLive(db, [
        link.from_contact_id,
        link.to_contact_id,
      ]);
      participants = [
        { contactId: link.from_contact_id, role: "actor" },
        { contactId: link.to_contact_id, role: "recipient" },
      ];
    }
    if (!input.force) {
      const dup = findDuplicateDateAnchor(db, {
        recurrenceKind: input.recurrenceKind,
        anchorMonth: input.anchorMonth,
        anchorDay: input.anchorDay,
        anchorContactId,
        anchorLinkId,
      });
      if (dup !== null) {
        throw new AffinityConflictError("duplicate date anchor");
      }
    }
    const occurredAt = resolveNow(input.now);
    const eventId = insertDateAnchorEvent(db, {
      occurredAt,
      summary,
      significance: sig,
      recurrenceKind: input.recurrenceKind,
      anchorMonth: input.anchorMonth,
      anchorDay: input.anchorDay,
      anchorContactId,
      anchorLinkId,
      participants,
      ...(input.now !== undefined ? { now: input.now } : {}),
    });
    upsertUpcomingOccurrence(db, eventId, resolveNow(input.now));
    return buildEventMutationReceipt(loadEventRecord(db, eventId), {
      created: [{ kind: "event", id: eventId }],
    });
  });
}
