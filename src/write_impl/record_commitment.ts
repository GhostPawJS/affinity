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
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import type { EventMutationReceipt } from "../lib/types/mutation_receipt.ts";
import type { RecordCommitmentInput } from "../lib/types/record_commitment_input.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";

export function recordCommitment(
  db: AffinityDb,
  input: RecordCommitmentInput,
): EventMutationReceipt {
  return withTransaction(db, () => {
    validateSocialEventInput(input);
    if (
      input.commitmentType !== "promise" &&
      input.commitmentType !== "agreement"
    ) {
      throw new AffinityValidationError(
        "commitmentType must be promise or agreement",
      );
    }
    const ownerId = requireOwnerContactId(db);
    const ids = input.participants.map((p) => p.contactId);
    assertParticipantContactsLive(db, ids);
    assertOwnerParticipates(ownerId, ids);
    const now = resolveNow(input.now);
    const eventId = insertJournalEvent(db, {
      type: input.commitmentType,
      occurredAt: input.occurredAt,
      summary: input.summary,
      significance: input.significance,
      momentKind: null,
      participants: input.participants,
      ...(input.now !== undefined ? { now: input.now } : {}),
    });
    db.prepare(
      `INSERT INTO open_commitments (
         event_id, commitment_type, due_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?)`,
    ).run(eventId, input.commitmentType, input.dueAt ?? null, now, now);
    return buildEventMutationReceipt(loadEventRecord(db, eventId), {
      created: [{ kind: "event", id: eventId }],
    });
  });
}
