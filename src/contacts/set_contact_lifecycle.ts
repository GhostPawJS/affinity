import { mapContactRowToContactListItem } from "../contacts/mappers.ts";
import { getContactRowById } from "../contacts/queries.ts";
import { buildContactMutationReceipt } from "../contacts/receipts.ts";
import { refreshContactRollup } from "../contacts/rollups.ts";
import type { ContactLifecycleState } from "../contacts/types.ts";
import { assertValidLifecycleTransition } from "../contacts/validators.ts";
import type { AffinityDb } from "../database.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import type { ContactMutationReceipt } from "../lib/types/mutation_receipt.ts";
import type { SetContactLifecycleOptions } from "../lib/types/set_contact_lifecycle_options.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";

const STATES = new Set(["active", "dormant", "merged", "lost"]);

export function setContactLifecycle(
  db: AffinityDb,
  contactId: number,
  lifecycleState: ContactLifecycleState,
  options?: SetContactLifecycleOptions,
): ContactMutationReceipt {
  return withTransaction(db, () => {
    if (!STATES.has(lifecycleState)) {
      throw new AffinityValidationError("invalid lifecycle state");
    }
    const row = getContactRowById(db, contactId);
    if (!row) {
      throw new AffinityNotFoundError("contact not found");
    }
    const from = row.lifecycle_state as ContactLifecycleState;
    assertValidLifecycleTransition(from, lifecycleState);
    const now = resolveNow(options?.now);
    if (from === lifecycleState) {
      return buildContactMutationReceipt(mapContactRowToContactListItem(row), {
        updated: [],
      });
    }
    db.prepare(
      "UPDATE contacts SET lifecycle_state = ?, updated_at = ? WHERE id = ?",
    ).run(lifecycleState, now, contactId);
    refreshContactRollup(db, contactId, now);
    const next = getContactRowById(db, contactId);
    if (!next) {
      throw new AffinityNotFoundError("contact not found");
    }
    return buildContactMutationReceipt(mapContactRowToContactListItem(next), {
      updated: [{ kind: "contact", id: contactId }],
    });
  });
}
