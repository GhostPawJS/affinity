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
import type { EventMutationReceipt } from "../lib/types/mutation_receipt.ts";
import type { RecordMilestoneInput } from "../lib/types/record_milestone_input.ts";
import { withTransaction } from "../with_transaction.ts";

export function recordMilestone(
  db: AffinityDb,
  input: RecordMilestoneInput,
): EventMutationReceipt {
  return withTransaction(db, () => {
    validateSocialEventInput(input);
    const ownerId = requireOwnerContactId(db);
    const ids = input.participants.map((p) => p.contactId);
    assertParticipantContactsLive(db, ids);
    assertOwnerParticipates(ownerId, ids);
    const eventId = insertJournalEvent(db, {
      type: "milestone",
      occurredAt: input.occurredAt,
      summary: input.summary,
      significance: input.significance,
      momentKind: "milestone",
      participants: input.participants,
      ...(input.now !== undefined ? { now: input.now } : {}),
    });
    return buildEventMutationReceipt(loadEventRecord(db, eventId), {
      created: [{ kind: "event", id: eventId }],
    });
  });
}
