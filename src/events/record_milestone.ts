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
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";
import { applyJournalEventMechanics } from "./apply_journal_event_mechanics.ts";

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
    const now = resolveNow(input.now);
    const eventId = insertJournalEvent(db, {
      type: "milestone",
      occurredAt: input.occurredAt,
      summary: input.summary,
      significance: input.significance,
      momentKind: null,
      participants: input.participants,
      now,
    });
    const mechanics = applyJournalEventMechanics(db, {
      eventId,
      eventType: "milestone",
      occurredAt: input.occurredAt,
      significance: input.significance,
      participants: input.participants,
      provenance: input.provenance,
      now,
    });
    return buildEventMutationReceipt(loadEventRecord(db, eventId), {
      created: [{ kind: "event", id: eventId }, ...mechanics.created],
      affectedLinks: mechanics.affectedLinks,
      derivedEffects: mechanics.derivedEffects,
    });
  });
}
