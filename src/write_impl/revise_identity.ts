import { getContactRowById } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import { mapIdentityRowToIdentityRecord } from "../identities/mappers.ts";
import { normalizeIdentityKey } from "../identities/normalize.ts";
import { getIdentityRowById } from "../identities/queries.ts";
import { buildIdentityMutationReceipt } from "../identities/receipts.ts";
import { assertNoIdentityCollision } from "../identities/validators.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import type { IdentityMutationReceipt } from "../lib/types/mutation_receipt.ts";
import type { ReviseIdentityPatch } from "../lib/types/revise_identity_patch.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";

export function reviseIdentity(
  db: AffinityDb,
  identityId: number,
  patch: ReviseIdentityPatch,
): IdentityMutationReceipt {
  return withTransaction(db, () => {
    const row = getIdentityRowById(db, identityId);
    if (!row) {
      throw new AffinityNotFoundError("identity not found");
    }
    const contact = getContactRowById(db, row.contact_id);
    if (!contact) {
      throw new AffinityNotFoundError("contact not found");
    }
    if (contact.lifecycle_state === "merged") {
      throw new AffinityStateError("merged contact is read-only");
    }
    const hasChange =
      patch.type !== undefined ||
      patch.value !== undefined ||
      patch.label !== undefined;
    if (!hasChange) {
      return buildIdentityMutationReceipt(mapIdentityRowToIdentityRecord(row), {
        updated: [],
      });
    }
    const nextType = patch.type !== undefined ? patch.type.trim() : row.type;
    const nextValue =
      patch.value !== undefined ? patch.value.trim() : row.value;
    if (nextType.length === 0 || nextValue.length === 0) {
      throw new AffinityValidationError("type and value must be non-empty");
    }
    const nextLabel = patch.label !== undefined ? patch.label : row.label;
    const nkNext = normalizeIdentityKey(nextType, nextValue);
    if (nkNext !== row.normalized_key) {
      assertNoIdentityCollision(db, nkNext, identityId);
    }
    const now = resolveNow();
    db.prepare(
      `UPDATE identities SET type = ?, value = ?, label = ?, normalized_key = ?, updated_at = ?
       WHERE id = ?`,
    ).run(nextType, nextValue, nextLabel, nkNext, now, identityId);
    const next = getIdentityRowById(db, identityId);
    if (!next) {
      throw new AffinityNotFoundError("identity not found");
    }
    return buildIdentityMutationReceipt(mapIdentityRowToIdentityRecord(next), {
      updated: [{ kind: "identity", id: identityId }],
    });
  });
}
