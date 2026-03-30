import { getContactRowById } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import type { DismissedPairRef } from "../lib/types/dismissed_pair_ref.ts";
import type { DismissalMutationReceipt } from "../lib/types/mutation_receipt.ts";
import { withTransaction } from "../with_transaction.ts";
import { buildDismissalMutationReceipt } from "./receipts.ts";

function canonicalize(a: number, b: number): DismissedPairRef {
  return {
    leftContactId: Math.min(a, b),
    rightContactId: Math.max(a, b),
  };
}

export function undismissDuplicate(
  db: AffinityDb,
  leftContactId: number,
  rightContactId: number,
): DismissalMutationReceipt {
  return withTransaction(db, () => {
    if (leftContactId === rightContactId) {
      throw new AffinityValidationError(
        "cannot undismiss a contact from itself",
      );
    }
    const left = getContactRowById(db, leftContactId);
    if (!left) {
      throw new AffinityNotFoundError(`contact ${leftContactId} not found`);
    }
    const right = getContactRowById(db, rightContactId);
    if (!right) {
      throw new AffinityNotFoundError(`contact ${rightContactId} not found`);
    }

    const pair = canonicalize(leftContactId, rightContactId);
    db.prepare(
      "DELETE FROM dismissed_duplicates WHERE left_id = ? AND right_id = ?",
    ).run(pair.leftContactId, pair.rightContactId);

    return buildDismissalMutationReceipt(pair);
  });
}
