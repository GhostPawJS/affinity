import type { AffinityDb } from "../database.ts";
import { loadEventRecord, requireDateAnchorEvent } from "../events/loaders.ts";
import { findDuplicateDateAnchor } from "../events/queries.ts";
import { buildEventMutationReceipt } from "../events/receipts.ts";
import { upsertUpcomingOccurrence } from "../events/upcoming_occurrences.ts";
import {
  assertValidRecurrenceKind,
  validateAnchorCalendar,
} from "../events/validators.ts";
import { AffinityConflictError } from "../lib/errors/affinity_conflict_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import type { EventMutationReceipt } from "../lib/types/mutation_receipt.ts";
import type { ReviseDateAnchorOptions } from "../lib/types/revise_date_anchor_options.ts";
import type { ReviseDateAnchorPatch } from "../lib/types/revise_date_anchor_patch.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";

export function reviseDateAnchor(
  db: AffinityDb,
  anchorEventId: number,
  patch: ReviseDateAnchorPatch,
  options?: ReviseDateAnchorOptions,
): EventMutationReceipt {
  return withTransaction(db, () => {
    const row = requireDateAnchorEvent(db, anchorEventId);
    const empty =
      patch.recurrenceKind === undefined &&
      patch.anchorMonth === undefined &&
      patch.anchorDay === undefined &&
      patch.summary === undefined &&
      patch.significance === undefined;
    if (empty) {
      return buildEventMutationReceipt(loadEventRecord(db, anchorEventId), {
        updated: [],
      });
    }
    if (patch.recurrenceKind !== undefined) {
      assertValidRecurrenceKind(patch.recurrenceKind);
    }
    const nextKind = patch.recurrenceKind ?? row.recurrence_kind;
    const nextMonth = patch.anchorMonth ?? row.anchor_month;
    const nextDay = patch.anchorDay ?? row.anchor_day;
    if (nextKind === null || nextMonth === null || nextDay === null) {
      throw new AffinityValidationError("invalid anchor metadata");
    }
    validateAnchorCalendar(nextMonth, nextDay);
    if (!options?.force) {
      const dup = findDuplicateDateAnchor(db, {
        excludeEventId: anchorEventId,
        recurrenceKind: nextKind,
        anchorMonth: nextMonth,
        anchorDay: nextDay,
        anchorContactId: row.anchor_contact_id,
        anchorLinkId: row.anchor_link_id,
      });
      if (dup !== null) {
        throw new AffinityConflictError("duplicate date anchor");
      }
    }
    const summary =
      patch.summary !== undefined ? patch.summary.trim() : row.summary;
    if (patch.summary !== undefined && summary.length === 0) {
      throw new AffinityValidationError("summary must be non-empty");
    }
    const sig =
      patch.significance !== undefined ? patch.significance : row.significance;
    if (patch.significance !== undefined) {
      if (!Number.isInteger(sig) || sig < 1 || sig > 10) {
        throw new AffinityValidationError(
          "significance must be an integer from 1 to 10",
        );
      }
    }
    const now = resolveNow(options?.now);
    db.prepare(
      `UPDATE events SET
         recurrence_kind = ?, anchor_month = ?, anchor_day = ?,
         summary = ?, significance = ?, updated_at = ?
       WHERE id = ?`,
    ).run(nextKind, nextMonth, nextDay, summary, sig, now, anchorEventId);
    upsertUpcomingOccurrence(db, anchorEventId, now);
    return buildEventMutationReceipt(loadEventRecord(db, anchorEventId), {
      updated: [{ kind: "event", id: anchorEventId }],
    });
  });
}
