import { mapContactRowToContactListItem } from "../contacts/mappers.ts";
import { getContactRowById } from "../contacts/queries.ts";
import { buildContactMutationReceipt } from "../contacts/receipts.ts";
import { refreshContactRollup } from "../contacts/rollups.ts";
import type { AffinityDb } from "../database.ts";
import { addIdentity } from "../identities/add_identity.ts";
import {
  legacyIdentityKey,
  normalizeIdentityKey,
} from "../identities/normalize.ts";
import { validateIdentityInput } from "../identities/validate_identity_input.ts";
import { AffinityConflictError } from "../lib/errors/affinity_conflict_error.ts";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import type { CreateContactInput } from "../lib/types/create_contact_input.ts";
import type { ContactMutationReceipt } from "../lib/types/mutation_receipt.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";

const KINDS = new Set([
  "human",
  "group",
  "company",
  "team",
  "pet",
  "service",
  "other",
]);

export function createContact(
  db: AffinityDb,
  input: CreateContactInput,
): ContactMutationReceipt {
  return withTransaction(db, () => {
    const name = input.name.trim();
    if (name.length === 0) {
      throw new AffinityValidationError("name must be non-empty");
    }
    if (!KINDS.has(input.kind)) {
      throw new AffinityValidationError("invalid contact kind");
    }
    if ((input as { isOwner?: unknown }).isOwner !== undefined) {
      throw new AffinityValidationError(
        "isOwner is read-only; pass bootstrapOwner: true to create the owner contact",
      );
    }
    if (
      input.ifExists !== undefined &&
      !["error", "return"].includes(input.ifExists)
    )
      throw new AffinityValidationError("ifExists must be error or return");
    const matches = (input.identities ?? []).flatMap((identity) => {
      validateIdentityInput(identity.type.trim(), identity.value.trim());
      const key = normalizeIdentityKey(identity.type, identity.value);
      const row = db
        .prepare(
          `SELECT c.id, c.name FROM identities i JOIN contacts c ON c.id=i.contact_id WHERE i.removed_at IS NULL AND c.deleted_at IS NULL AND (i.normalized_key IN (?, ?) OR (i.type = 'custom:atproto-did' AND ? = 'did:' || lower(i.value)))`,
        )
        .get(key, legacyIdentityKey(key), key) as
        | { id: number; name: string }
        | undefined;
      return row ? [{ ...row, identity }] : [];
    });
    const match = matches[0];
    if (match) {
      if (input.ifExists === "return") {
        const existing = getContactRowById(db, match.id);
        if (!existing)
          throw new AffinityInvariantError("identity owner not found");
        const primary = mapContactRowToContactListItem(existing);
        return Object.assign(buildContactMutationReceipt(primary, {}), {
          outcome: "no_op" as const,
          matchedIdentities: matches.map((m) => m.identity),
        });
      }
      const error = new AffinityConflictError(
        `identity ${normalizeIdentityKey(match.identity.type, match.identity.value).replace(":", " ")} already belongs to #${match.id} ${match.name}`,
      );
      error.existingContactId = match.id;
      throw error;
    }
    const now = resolveNow(input.now);
    if (input.bootstrapOwner) {
      const existing = db
        .prepare(
          "SELECT id, name FROM contacts WHERE is_owner = 1 AND deleted_at IS NULL",
        )
        .get() as { id: number; name: string } | undefined;
      if (existing !== undefined) {
        throw new AffinityConflictError(
          `owner already exists: contact ${existing.id} (${existing.name}); bootstrapOwner can only be used once`,
        );
      }
    }
    const isOwner = input.bootstrapOwner ? 1 : 0;
    const result = db
      .prepare(
        `INSERT INTO contacts (name, kind, lifecycle_state, is_owner, created_at, updated_at)
         VALUES (?, ?, 'active', ?, ?, ?)`,
      )
      .run(name, input.kind, isOwner, now, now);
    const id = Number(result.lastInsertRowid);
    const row = getContactRowById(db, id);
    if (!row) {
      throw new AffinityInvariantError("inserted contact row not found");
    }
    refreshContactRollup(db, id, now);
    const primary = mapContactRowToContactListItem(row);
    const receipt = buildContactMutationReceipt(primary, {
      created: [{ kind: "contact", id }],
    });
    for (const identity of input.identities ?? [])
      receipt.created.push(...addIdentity(db, id, identity).created);
    return receipt;
  });
}
