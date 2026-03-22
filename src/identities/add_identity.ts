import { getContactRowById } from "../contacts/queries.ts";
import { refreshContactRollup } from "../contacts/rollups.ts";
import type { AffinityDb } from "../database.ts";
import { mapIdentityRowToIdentityRecord } from "../identities/mappers.ts";
import { normalizeIdentityKey } from "../identities/normalize.ts";
import { getIdentityRowById } from "../identities/queries.ts";
import { buildIdentityMutationReceipt } from "../identities/receipts.ts";
import { assertNoIdentityCollision } from "../identities/validators.ts";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import type { AddIdentityInput } from "../lib/types/add_identity_input.ts";
import type { IdentityMutationReceipt } from "../lib/types/mutation_receipt.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";

export function addIdentity(
  db: AffinityDb,
  contactId: number,
  input: AddIdentityInput,
): IdentityMutationReceipt {
  return withTransaction(db, () => {
    const contact = getContactRowById(db, contactId);
    if (!contact) {
      throw new AffinityNotFoundError("contact not found");
    }
    if (contact.lifecycle_state === "merged") {
      throw new AffinityStateError("merged contact is read-only");
    }
    const type = input.type.trim();
    const value = input.value.trim();
    if (type.length === 0 || value.length === 0) {
      throw new AffinityValidationError("type and value must be non-empty");
    }
    const nk = normalizeIdentityKey(type, value);
    assertNoIdentityCollision(db, nk);
    const now = resolveNow(input.now);
    const verified = input.verified ? 1 : 0;
    const verifiedAt = verified === 1 ? now : null;
    const result = db
      .prepare(
        `INSERT INTO identities (contact_id, type, value, label, normalized_key, verified, verified_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        contactId,
        type,
        value,
        input.label ?? null,
        nk,
        verified,
        verifiedAt,
        now,
        now,
      );
    const id = Number(result.lastInsertRowid);
    const row = getIdentityRowById(db, id);
    if (!row) {
      throw new AffinityInvariantError("inserted identity not found");
    }
    refreshContactRollup(db, contactId, now);
    return buildIdentityMutationReceipt(mapIdentityRowToIdentityRecord(row), {
      created: [{ kind: "identity", id }],
    });
  });
}
