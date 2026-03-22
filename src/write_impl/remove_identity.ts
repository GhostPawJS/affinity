import type { AffinityDb } from "../database.ts";
import { mapIdentityRowToIdentityRecord } from "../identities/mappers.ts";
import { getIdentityRowById } from "../identities/queries.ts";
import { buildIdentityMutationReceipt } from "../identities/receipts.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import type { IdentityMutationReceipt } from "../lib/types/mutation_receipt.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";

export function removeIdentity(
  db: AffinityDb,
  identityId: number,
  removedAt?: number,
): IdentityMutationReceipt {
  return withTransaction(db, () => {
    const row = getIdentityRowById(db, identityId);
    if (!row) {
      throw new AffinityNotFoundError("identity not found");
    }
    const primary = mapIdentityRowToIdentityRecord(row);
    const now = resolveNow(removedAt);
    db.prepare(
      "UPDATE identities SET removed_at = ?, updated_at = ? WHERE id = ?",
    ).run(now, now, identityId);
    return buildIdentityMutationReceipt(primary, {
      removed: [{ kind: "identity", id: identityId }],
    });
  });
}
