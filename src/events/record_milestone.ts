import { requireOwnerContactId } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import { loadEventRecord } from "../events/loaders.ts";
import { insertJournalEvent } from "../events/persistence.ts";
import { buildEventMutationReceipt } from "../events/receipts.ts";
import {
  assertOwnerParticipates,
  assertParticipantContactsLive,
  validateSocialEventInput,
} from "../events/validators.ts";
import { localCalendarDate } from "../lib/parse_calendar_time.ts";
import type { EventMutationReceipt } from "../lib/types/mutation_receipt.ts";
import type { RecordMilestoneInput } from "../lib/types/record_milestone_input.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";
import { applyJournalEventMechanics } from "./apply_journal_event_mechanics.ts";
import { existingEventReceipt } from "./event_metadata.ts";

export function recordMilestone(
  db: AffinityDb,
  input: RecordMilestoneInput,
): EventMutationReceipt {
  return withTransaction(db, () => {
    validateSocialEventInput(input);
    const existing = existingEventReceipt(db, input.externalRef);
    if (existing) return existing;
    const ownerId = requireOwnerContactId(db);
    const ids = input.participants.map((p) => p.contactId);
    assertParticipantContactsLive(db, ids);
    assertOwnerParticipates(ownerId, ids);
    const now = resolveNow(input.now);
    const eventId = insertJournalEvent(db, {
      ...input,
      type: "milestone",
      occurredAt: input.occurredAt,
      occurredOn: input.occurredOn,
      significance: input.significance,
      momentKind: input.momentKind ?? null,
      participants: input.participants,
      now,
    });
    const mechanics = applyJournalEventMechanics(db, {
      eventId,
      eventType: "milestone",
      occurredAt: input.occurredAt,
      occurredOn: input.occurredOn,
      significance: input.significance,
      participants: input.participants,
      provenance: input.provenance,
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
