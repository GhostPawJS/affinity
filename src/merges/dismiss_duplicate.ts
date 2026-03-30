import { getContactRowById } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import type { DismissedPairRef } from "../lib/types/dismissed_pair_ref.ts";
import type { DismissalMutationReceipt } from "../lib/types/mutation_receipt.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";
import { buildDismissalMutationReceipt } from "./receipts.ts";

function canonicalize(a: number, b: number): DismissedPairRef {
  return {
    leftContactId: Math.min(a, b),
    rightContactId: Math.max(a, b),
  };
}

export function dismissDuplicate(
  db: AffinityDb,
  leftContactId: number,
  rightContactId: number,
  reason?: string | null,
  now?: number,
): DismissalMutationReceipt {
  return withTransaction(db, () => {
    if (leftContactId === rightContactId) {
      throw new AffinityValidationError(
        "cannot dismiss a contact as a duplicate of itself",
      );
    }
    const left = getContactRowById(db, leftContactId);
    if (!left) {
      throw new AffinityNotFoundError(`contact ${leftContactId} not found`);
    }
    if (left.lifecycle_state === "merged") {
      throw new AffinityStateError(
        `contact ${leftContactId} is merged and cannot be dismissed`,
      );
    }
    const right = getContactRowById(db, rightContactId);
    if (!right) {
      throw new AffinityNotFoundError(`contact ${rightContactId} not found`);
    }
    if (right.lifecycle_state === "merged") {
      throw new AffinityStateError(
        `contact ${rightContactId} is merged and cannot be dismissed`,
      );
    }

    const pair = canonicalize(leftContactId, rightContactId);
    const resolvedNow = resolveNow(now);
    const resolvedReason =
      reason === undefined || reason === null
        ? null
        : (() => {
            const t = reason.trim();
            return t.length === 0 ? null : t;
          })();

    db.prepare(
      `INSERT INTO dismissed_duplicates (left_id, right_id, reason, dismissed_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(left_id, right_id) DO UPDATE SET
         reason = excluded.reason,
         dismissed_at = excluded.dismissed_at`,
    ).run(pair.leftContactId, pair.rightContactId, resolvedReason, resolvedNow);

    return buildDismissalMutationReceipt(pair);
  });
}
