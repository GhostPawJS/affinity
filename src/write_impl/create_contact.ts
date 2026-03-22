import { mapContactRowToContactListItem } from "../contacts/mappers.ts";
import { getContactRowById } from "../contacts/queries.ts";
import { buildContactMutationReceipt } from "../contacts/receipts.ts";
import type { AffinityDb } from "../database.ts";
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
    const now = resolveNow(input.now);
    if (input.bootstrapOwner) {
      const existing = db
        .prepare(
          "SELECT id FROM contacts WHERE is_owner = 1 AND deleted_at IS NULL",
        )
        .get();
      if (existing !== undefined) {
        throw new AffinityConflictError("owner already exists");
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
    const primary = mapContactRowToContactListItem(row);
    return buildContactMutationReceipt(primary, {
      created: [{ kind: "contact", id }],
    });
  });
}
