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
import type { EntityRef } from "../lib/types/entity_ref.ts";
import type { EventMutationReceipt } from "../lib/types/mutation_receipt.ts";
import type { RecordInteractionInput } from "../lib/types/record_interaction_input.ts";
import { findLiveRelationalLinkAnyDirection } from "../links/queries.ts";
import { withTransaction } from "../with_transaction.ts";
import { seedSocialLink } from "./seed_social_link.ts";

const ALLOWED = new Set<string>([
  "conversation",
  "activity",
  "gift",
  "support",
  "conflict",
  "correction",
]);

export function recordInteraction(
  db: AffinityDb,
  input: RecordInteractionInput,
): EventMutationReceipt {
  return withTransaction(db, () => {
    validateSocialEventInput(input);
    if (!ALLOWED.has(input.type)) {
      throw new AffinityValidationError("invalid interaction event type");
    }
    const ownerId = requireOwnerContactId(db);
    const ids = input.participants.map((p) => p.contactId);
    assertParticipantContactsLive(db, ids);
    assertOwnerParticipates(ownerId, ids);
    const eventId = insertJournalEvent(db, {
      type: input.type,
      occurredAt: input.occurredAt,
      summary: input.summary,
      significance: input.significance,
      momentKind: null,
      participants: input.participants,
      ...(input.now !== undefined ? { now: input.now } : {}),
    });
    const created: EntityRef[] = [{ kind: "event", id: eventId }];
    const affectedLinks: number[] = [];
    for (const p of input.participants) {
      if (p.contactId === ownerId) {
        continue;
      }
      const other = p.contactId;
      if (findLiveRelationalLinkAnyDirection(db, ownerId, other)) {
        continue;
      }
      const lr = seedSocialLink(db, {
        fromContactId: ownerId,
        toContactId: other,
        kind: "personal",
        ...(input.now !== undefined ? { now: input.now } : {}),
      });
      created.push({ kind: "link", id: lr.primary.id });
      affectedLinks.push(lr.primary.id);
    }
    return buildEventMutationReceipt(loadEventRecord(db, eventId), {
      created,
      affectedLinks,
    });
  });
}
