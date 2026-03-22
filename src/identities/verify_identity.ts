import type { AffinityDb } from "../database.ts";
import { mapIdentityRowToIdentityRecord } from "../identities/mappers.ts";
import { getIdentityRowById } from "../identities/queries.ts";
import { buildIdentityMutationReceipt } from "../identities/receipts.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import type { IdentityMutationReceipt } from "../lib/types/mutation_receipt.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";

export function verifyIdentity(
  db: AffinityDb,
  identityId: number,
  verifiedAt?: number,
): IdentityMutationReceipt {
  return withTransaction(db, () => {
    const row = getIdentityRowById(db, identityId);
    if (!row) {
      throw new AffinityNotFoundError("identity not found");
    }
    const at = resolveNow(verifiedAt);
    const now = resolveNow();
    db.prepare(
      "UPDATE identities SET verified = 1, verified_at = ?, updated_at = ? WHERE id = ?",
    ).run(at, now, identityId);
    const next = getIdentityRowById(db, identityId);
    if (!next) {
      throw new AffinityNotFoundError("identity not found");
    }
    return buildIdentityMutationReceipt(mapIdentityRowToIdentityRecord(next), {
      updated: [{ kind: "identity", id: identityId }],
    });
  });
}
