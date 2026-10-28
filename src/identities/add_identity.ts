import { getContactRowById } from "../contacts/queries.ts";
import { refreshContactRollup } from "../contacts/rollups.ts";
import type { AffinityDb } from "../database.ts";
import { mapIdentityRowToIdentityRecord } from "../identities/mappers.ts";
import {
  legacyIdentityKey,
  normalizeIdentityKey,
  normalizeIdentityValue,
} from "../identities/normalize.ts";
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
import { validateIdentityInput } from "./validate_identity_input.ts";

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
    const value = normalizeIdentityValue(type, input.value);
    if (type.length === 0 || value.length === 0) {
      throw new AffinityValidationError("type and value must be non-empty");
    }
    validateIdentityInput(type, value);
    if (
      input.ifExists !== undefined &&
      !["error", "return"].includes(input.ifExists)
    )
      throw new AffinityValidationError("ifExists must be error or return");
    const nk = normalizeIdentityKey(type, value);
    if (input.ifExists === "return") {
      const existing = db
        .prepare(
          "SELECT id FROM identities WHERE contact_id=? AND (normalized_key IN (?, ?) OR (type='custom:atproto-did' AND ? = 'did:' || lower(value))) AND removed_at IS NULL",
        )
        .get(contactId, nk, legacyIdentityKey(nk), nk);
      if (existing) {
        const row = getIdentityRowById(db, Number(existing.id));
        if (row)
          return buildIdentityMutationReceipt(
            mapIdentityRowToIdentityRecord(row),
            {},
          );
      }
    }
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
    db.prepare(
      "DELETE FROM dismissed_duplicates WHERE left_id = ? OR right_id = ?",
    ).run(contactId, contactId);
    return buildIdentityMutationReceipt(mapIdentityRowToIdentityRecord(row), {
      created: [{ kind: "identity", id }],
    });
  });
}
