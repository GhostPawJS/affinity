import { requireOwnerContactId } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import { loadEventRecord } from "../events/loaders.ts";
import { insertJournalEvent } from "../events/persistence.ts";
import { buildEventMutationReceipt } from "../events/receipts.ts";
import {
  assertParticipantContactsLive,
  validateSocialEventInput,
} from "../events/validators.ts";
import type { EntityRef } from "../lib/types/entity_ref.ts";
import type { EventMutationReceipt } from "../lib/types/mutation_receipt.ts";
import type { RecordObservationInput } from "../lib/types/record_observation_input.ts";
import { findLiveRelationalLinkAnyDirection } from "../links/queries.ts";
import { withTransaction } from "../with_transaction.ts";
import { seedSocialLink } from "./seed_social_link.ts";

export function recordObservation(
  db: AffinityDb,
  input: RecordObservationInput,
): EventMutationReceipt {
  return withTransaction(db, () => {
    validateSocialEventInput(input);
    const ownerId = requireOwnerContactId(db);
    const ids = input.participants.map((p) => p.contactId);
    assertParticipantContactsLive(db, ids);
    const eventId = insertJournalEvent(db, {
      type: "observation",
      occurredAt: input.occurredAt,
      summary: input.summary,
      significance: input.significance,
      momentKind: null,
      participants: input.participants,
      ...(input.now !== undefined ? { now: input.now } : {}),
    });
    const created: EntityRef[] = [{ kind: "event", id: eventId }];
    const affectedLinks: number[] = [];
    const hasOwner = ids.includes(ownerId);
    if (!hasOwner && ids.length === 2) {
      const x = ids[0] as number;
      const y = ids[1] as number;
      const a = Math.min(x, y);
      const b = Math.max(x, y);
      if (!findLiveRelationalLinkAnyDirection(db, a, b)) {
        const lr = seedSocialLink(db, {
          fromContactId: a,
          toContactId: b,
          kind: "observed",
          ...(input.now !== undefined ? { now: input.now } : {}),
        });
        created.push({ kind: "link", id: lr.primary.id });
        affectedLinks.push(lr.primary.id);
      }
    }
    return buildEventMutationReceipt(loadEventRecord(db, eventId), {
      created,
      affectedLinks,
    });
  });
}
