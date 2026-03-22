import { getContactRowById } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import type { LinkMutationReceipt } from "../lib/types/mutation_receipt.ts";
import type { SetStructuralTieInput } from "../lib/types/set_structural_tie_input.ts";
import { isStructuralLinkKind } from "../links/kinds.ts";
import { mapLinkRowToLinkListItem } from "../links/mappers.ts";
import { findLiveStructuralTie, getLinkRowById } from "../links/queries.ts";
import { buildLinkMutationReceipt } from "../links/receipts.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";

export function setStructuralTie(
  db: AffinityDb,
  input: SetStructuralTieInput,
): LinkMutationReceipt {
  return withTransaction(db, () => {
    if (!isStructuralLinkKind(input.kind)) {
      throw new AffinityValidationError("invalid structural link kind");
    }
    if (input.fromContactId === input.toContactId) {
      throw new AffinityValidationError("from and to contacts must differ");
    }
    const from = getContactRowById(db, input.fromContactId);
    const to = getContactRowById(db, input.toContactId);
    if (!from || !to) {
      throw new AffinityNotFoundError("contact not found");
    }
    if (from.lifecycle_state === "merged" || to.lifecycle_state === "merged") {
      throw new AffinityStateError("merged contact is read-only");
    }
    const roleRaw = input.role?.trim() ?? "";
    const roleNormalized = roleRaw.length === 0 ? null : roleRaw;
    const now = resolveNow(input.now);
    const existing = findLiveStructuralTie(
      db,
      input.fromContactId,
      input.toContactId,
      input.kind,
      roleNormalized,
    );
    if (existing) {
      db.prepare("UPDATE links SET updated_at = ? WHERE id = ?").run(
        now,
        existing.id,
      );
      const row = getLinkRowById(db, existing.id);
      if (!row) {
        throw new AffinityInvariantError(
          "structural tie not found after update",
        );
      }
      return buildLinkMutationReceipt(mapLinkRowToLinkListItem(row), {
        updated: [{ kind: "link", id: existing.id }],
      });
    }
    const result = db
      .prepare(
        `INSERT INTO links (
           from_contact_id, to_contact_id, kind, role, is_structural,
           rank, affinity, trust, state, cadence_days, bond,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, 1, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)`,
      )
      .run(
        input.fromContactId,
        input.toContactId,
        input.kind,
        roleNormalized,
        now,
        now,
      );
    const id = Number(result.lastInsertRowid);
    const row = getLinkRowById(db, id);
    if (!row) {
      throw new AffinityInvariantError("inserted structural tie not found");
    }
    return buildLinkMutationReceipt(mapLinkRowToLinkListItem(row), {
      created: [{ kind: "link", id }],
    });
  });
}
