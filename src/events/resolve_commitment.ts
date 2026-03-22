import { requireOwnerContactId } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import {
  loadEventParticipantViews,
  loadEventRecord,
} from "../events/loaders.ts";
import { insertJournalEvent } from "../events/persistence.ts";
import { getEventRowById } from "../events/queries.ts";
import { buildEventMutationReceipt } from "../events/receipts.ts";
import {
  assertOwnerParticipates,
  assertParticipantContactsLive,
  validateSocialEventInput,
} from "../events/validators.ts";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import type { CommitmentResolutionKind } from "../lib/types/commitment_resolution_kind.ts";
import type { DerivedLinkEffect } from "../lib/types/derived_link_effect.ts";
import type { EntityRef } from "../lib/types/entity_ref.ts";
import type { EventMutationReceipt } from "../lib/types/mutation_receipt.ts";
import type { ResolveCommitmentOptions } from "../lib/types/resolve_commitment_options.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";
import { applyJournalEventMechanics } from "./apply_journal_event_mechanics.ts";

function defaultResolutionSummary(
  resolution: CommitmentResolutionKind,
  eventType: string,
  summary: string | null,
): string {
  const stem = summary?.trim() || eventType;
  switch (resolution) {
    case "kept":
      return `Kept ${eventType}: ${stem}`;
    case "cancelled":
      return `Cancelled ${eventType}: ${stem}`;
    case "broken":
      return `Broken ${eventType}: ${stem}`;
  }
}

export function resolveCommitment(
  db: AffinityDb,
  commitmentEventId: number,
  resolution: CommitmentResolutionKind,
  options?: ResolveCommitmentOptions,
): EventMutationReceipt {
  return withTransaction(db, () => {
    const row = getEventRowById(db, commitmentEventId);
    if (!row) {
      throw new AffinityNotFoundError("event not found");
    }
    if (row.type !== "promise" && row.type !== "agreement") {
      throw new AffinityInvariantError("not a commitment event");
    }
    const open = db
      .prepare("SELECT resolved_at FROM open_commitments WHERE event_id = ?")
      .get(commitmentEventId) as { resolved_at: number | null } | undefined;
    if (!open) {
      throw new AffinityNotFoundError("open commitment not found");
    }
    if (open.resolved_at !== null) {
      throw new AffinityStateError("commitment already resolved");
    }
    const now = resolveNow(options?.now);
    const originalParticipants = loadEventParticipantViews(
      db,
      commitmentEventId,
    );
    const result = db
      .prepare(
        `UPDATE open_commitments
         SET resolution = ?, resolved_at = ?, updated_at = ?
         WHERE event_id = ? AND resolved_at IS NULL`,
      )
      .run(resolution, now, now, commitmentEventId);
    if (Number(result.changes ?? 0) === 0) {
      throw new AffinityStateError("commitment already resolved");
    }
    const shouldCreateResolvingEvent =
      options?.resolvingEvent !== undefined || resolution === "broken";
    const created: EntityRef[] = [];
    const affectedLinks: number[] = [];
    const derivedEffects: DerivedLinkEffect[] = [];
    if (shouldCreateResolvingEvent) {
      const eventType =
        options?.resolvingEvent?.type ?? (row.type as "promise" | "agreement");
      const participants =
        options?.resolvingEvent?.participants ?? originalParticipants;
      const summary =
        options?.resolvingEvent?.summary ??
        defaultResolutionSummary(resolution, row.type, row.summary);
      const significance = options?.resolvingEvent?.significance ?? 7;
      const occurredAt = options?.resolvingEvent?.occurredAt ?? now;
      validateSocialEventInput({
        occurredAt,
        summary,
        significance,
        participants,
        provenance: options?.resolvingEvent?.provenance,
      });
      const ownerId = requireOwnerContactId(db);
      const participantIds = participants.map(
        (participant) => participant.contactId,
      );
      assertParticipantContactsLive(db, participantIds);
      if (eventType !== "observation") {
        assertOwnerParticipates(ownerId, participantIds);
      }
      const resolvingEventId = insertJournalEvent(db, {
        type: eventType,
        occurredAt,
        summary,
        significance,
        momentKind: null,
        participants,
        now,
      });
      created.push({ kind: "event" as const, id: resolvingEventId });
      const mechanics = applyJournalEventMechanics(db, {
        eventId: resolvingEventId,
        eventType,
        occurredAt,
        significance,
        participants,
        provenance: {
          commitmentEventId,
          commitmentResolution: resolution,
          ...(options?.resolvingEvent?.provenance !== null &&
          typeof options?.resolvingEvent?.provenance === "object"
            ? options.resolvingEvent.provenance
            : {}),
        },
        now,
      });
      created.push(...mechanics.created);
      affectedLinks.push(...mechanics.affectedLinks);
      derivedEffects.push(...mechanics.derivedEffects);
    }
    return buildEventMutationReceipt(loadEventRecord(db, commitmentEventId), {
      created,
      updated: [{ kind: "event", id: commitmentEventId }],
      affectedLinks,
      derivedEffects,
    });
  });
}
