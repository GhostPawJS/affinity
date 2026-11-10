import { mapContactRowToContactListItem } from "../contacts/mappers.ts";
import { getContactRowById } from "../contacts/queries.ts";
import { buildContactMutationReceipt } from "../contacts/receipts.ts";
import { refreshContactRollup } from "../contacts/rollups.ts";
import type { AffinityDb } from "../database.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import type { ContactMutationReceipt } from "../lib/types/mutation_receipt.ts";
import type { ReviseContactPatch } from "../lib/types/revise_contact_patch.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";

export function reviseContact(
  db: AffinityDb,
  contactId: number,
  patch: ReviseContactPatch,
): ContactMutationReceipt {
  return withTransaction(db, () => {
    const row = getContactRowById(db, contactId);
    if (!row) {
      throw new AffinityNotFoundError("contact not found");
    }
    if (row.lifecycle_state === "merged") {
      throw new AffinityStateError("merged contact is read-only");
    }
    if (
      patch.doNotContact !== undefined &&
      typeof patch.doNotContact !== "boolean"
    )
      throw new AffinityValidationError("doNotContact must be a boolean");
    if (patch.name === undefined && patch.doNotContact === undefined) {
      return buildContactMutationReceipt(mapContactRowToContactListItem(row), {
        updated: [],
      });
    }
    const name = patch.name === undefined ? row.name : patch.name.trim();
    if (name.length === 0) {
      throw new AffinityValidationError("name must be non-empty");
    }
    const now = resolveNow();
    db.prepare("UPDATE contacts SET name = ?, updated_at = ? WHERE id = ?").run(
      name,
      now,
      contactId,
    );
    if (patch.doNotContact !== undefined)
      db.prepare("UPDATE contacts SET do_not_contact=? WHERE id=?").run(
        patch.doNotContact ? 1 : 0,
        contactId,
      );
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
