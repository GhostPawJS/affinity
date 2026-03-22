import type { AffinityDb } from "../database.ts";
import { loadEventRecord } from "../events/loaders.ts";
import { getEventRowById } from "../events/queries.ts";
import { buildEventMutationReceipt } from "../events/receipts.ts";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import type { CommitmentResolutionKind } from "../lib/types/commitment_resolution_kind.ts";
import type { EventMutationReceipt } from "../lib/types/mutation_receipt.ts";
import type { ResolveCommitmentOptions } from "../lib/types/resolve_commitment_options.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";

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
    return buildEventMutationReceipt(loadEventRecord(db, commitmentEventId), {
      updated: [{ kind: "event", id: commitmentEventId }],
    });
  });
}
