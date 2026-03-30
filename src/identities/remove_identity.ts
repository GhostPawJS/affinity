import { getContactRowById } from "../contacts/queries.ts";
import { refreshContactRollup } from "../contacts/rollups.ts";
import type { AffinityDb } from "../database.ts";
import { mapIdentityRowToIdentityRecord } from "../identities/mappers.ts";
import { getIdentityRowById } from "../identities/queries.ts";
import { buildIdentityMutationReceipt } from "../identities/receipts.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
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
    const contact = getContactRowById(db, row.contact_id);
    if (contact?.lifecycle_state === "merged") {
      throw new AffinityStateError("merged contact is read-only");
    }
    const primary = mapIdentityRowToIdentityRecord(row);
    const now = resolveNow(removedAt);
    db.prepare(
      "UPDATE identities SET removed_at = ?, updated_at = ? WHERE id = ?",
    ).run(now, now, identityId);
    refreshContactRollup(db, row.contact_id, now);
    db.prepare(
      "DELETE FROM dismissed_duplicates WHERE left_id = ? OR right_id = ?",
    ).run(row.contact_id, row.contact_id);
    return buildIdentityMutationReceipt(primary, {
      removed: [{ kind: "identity", id: identityId }],
    });
  });
}
