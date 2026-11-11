import { requireOwnerContactId } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import { loadEventRecord } from "../events/loaders.ts";
import { insertJournalEvent } from "../events/persistence.ts";
import { buildEventMutationReceipt } from "../events/receipts.ts";
import {
  assertOutboundContactAllowed,
  assertOwnerParticipates,
  assertParticipantContactsLive,
  validateSocialEventInput,
} from "../events/validators.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import { localCalendarDate } from "../lib/parse_calendar_time.ts";
import type { EventMutationReceipt } from "../lib/types/mutation_receipt.ts";
import type { RecordInteractionInput } from "../lib/types/record_interaction_input.ts";
import type { RecordObservationInput } from "../lib/types/record_observation_input.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";
import { applyJournalEventMechanics } from "./apply_journal_event_mechanics.ts";
import { existingEventReceipt } from "./event_metadata.ts";

const ALLOWED = new Set<string>([
  "conversation",
  "activity",
  "gift",
  "support",
  "conflict",
  "correction",
]);

export function recordSocialEvent(
  db: AffinityDb,
  input: RecordObservationInput | RecordInteractionInput,
  kind: "interaction" | "observation" | "milestone" | "transaction",
): EventMutationReceipt {
  return withTransaction(db, () => {
    validateSocialEventInput(input);
    const existing = existingEventReceipt(db, input.externalRef);
    if (existing) return existing;
    const type =
      kind === "interaction" ? (input as RecordInteractionInput).type : kind;
    if (kind === "interaction" && !ALLOWED.has(type)) {
      throw new AffinityValidationError("invalid interaction event type");
    }
    const ownerId =
      kind === "observation" ? undefined : requireOwnerContactId(db);
    const ids = input.participants.map((p) => p.contactId);
    assertParticipantContactsLive(db, ids);
    if (ownerId !== undefined) {
      assertOwnerParticipates(ownerId, ids);
      assertOutboundContactAllowed(db, input);
    }
    const now = resolveNow(input.now);
    const eventId = insertJournalEvent(db, {
      ...input,
      type,
      momentKind: input.momentKind ?? null,
      now,
    });
    const mechanics = applyJournalEventMechanics(db, {
      ...input,
      eventId,
      eventType: type,
      now,
    });
    if (input.momentKind !== undefined)
      db.prepare("UPDATE events SET moment_kind=? WHERE id=?").run(
        input.momentKind,
        eventId,
      );
    return buildEventMutationReceipt(loadEventRecord(db, eventId), {
      warnings:
        input.occurredAt > now &&
        (input.occurredOn ??
          new Date(input.occurredAt).toISOString().slice(0, 10)) >
          localCalendarDate(now)
          ? [
              {
                code: "future_event",
                message:
                  "occurredAt is in the future; it will not count as contact until then",
              },
            ]
          : undefined,
      created: [{ kind: "event", id: eventId }, ...mechanics.created],
      affectedLinks: mechanics.affectedLinks,
      derivedEffects: mechanics.derivedEffects,
    });
  });
}
