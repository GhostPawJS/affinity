import type { AffinityDb } from "../database.ts";
import {
  loadEventParticipantViews,
  requireDateAnchorEvent,
} from "../events/loaders.ts";
import { mapEventRowToEventRecord } from "../events/mappers.ts";
import { buildEventMutationReceipt } from "../events/receipts.ts";
import { deleteUpcomingOccurrence } from "../events/upcoming_occurrences.ts";
import type { EventMutationReceipt } from "../lib/types/mutation_receipt.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";

export function removeDateAnchor(
  db: AffinityDb,
  anchorEventId: number,
  removedAt?: number,
): EventMutationReceipt {
  return withTransaction(db, () => {
    const row = requireDateAnchorEvent(db, anchorEventId);
    const participants = loadEventParticipantViews(db, anchorEventId);
    const primary = mapEventRowToEventRecord(row, participants);
    const now = resolveNow(removedAt);
    deleteUpcomingOccurrence(db, anchorEventId);
    db.prepare(
      "UPDATE events SET deleted_at = ?, updated_at = ? WHERE id = ?",
    ).run(now, now, anchorEventId);
    return buildEventMutationReceipt(primary, {
      removed: [{ kind: "event", id: anchorEventId }],
    });
  });
}
