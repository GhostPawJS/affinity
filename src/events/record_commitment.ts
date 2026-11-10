import { requireOwnerContactId } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import { loadEventRecord } from "../events/loaders.ts";
import { insertJournalEvent } from "../events/persistence.ts";
import { buildEventMutationReceipt } from "../events/receipts.ts";
import {
  assertFiniteTimestamp,
  assertOutboundContactAllowed,
  assertOwnerParticipates,
  assertParticipantContactsLive,
  validateSocialEventInput,
} from "../events/validators.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import { parseCalendarTime } from "../lib/parse_calendar_time.ts";
import type { EventMutationReceipt } from "../lib/types/mutation_receipt.ts";
import type { RecordCommitmentInput } from "../lib/types/record_commitment_input.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";
import { applyJournalEventMechanics } from "./apply_journal_event_mechanics.ts";
import { existingEventReceipt } from "./event_metadata.ts";

export function recordCommitment(
  db: AffinityDb,
  input: RecordCommitmentInput,
): EventMutationReceipt {
  return withTransaction(db, () => {
    validateSocialEventInput(input);
    const existing = existingEventReceipt(db, input.externalRef);
    if (existing) return existing;
    if (
      input.commitmentType !== "promise" &&
      input.commitmentType !== "agreement"
    ) {
      throw new AffinityValidationError(
        "commitmentType must be promise or agreement",
      );
    }
    if (input.dueAt != null) {
      assertFiniteTimestamp(input.dueAt, "dueAt");
    }
    const ownerId = requireOwnerContactId(db);
    const ids = input.participants.map((p) => p.contactId);
    assertParticipantContactsLive(db, ids);
    assertOwnerParticipates(ownerId, ids);
    assertOutboundContactAllowed(db, input);
    const now = resolveNow(input.now);
    const eventId = insertJournalEvent(db, {
      ...input,
      type: input.commitmentType,
      occurredAt: input.occurredAt,
      occurredOn: input.occurredOn,
      significance: input.significance,
      momentKind: input.momentKind ?? null,
      participants: input.participants,
      now,
    });
    db.prepare(
      `INSERT INTO open_commitments (
         event_id, commitment_type, due_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?)`,
    ).run(eventId, input.commitmentType, input.dueAt ?? null, now, now);
    db.prepare("UPDATE open_commitments SET due_on = ? WHERE event_id = ?").run(
      input.dueAt == null
        ? null
        : (input.dueOn ?? parseCalendarTime(input.dueAt, "dueAt").day),
      eventId,
    );
    const mechanics = applyJournalEventMechanics(db, {
      eventId,
      eventType: input.commitmentType,
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
      created: [{ kind: "event", id: eventId }, ...mechanics.created],
      affectedLinks: mechanics.affectedLinks,
      derivedEffects: mechanics.derivedEffects,
    });
  });
}
