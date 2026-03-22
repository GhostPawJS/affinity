import type { AffinityDb } from "../database.ts";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import type { LinkMutationReceipt } from "../lib/types/mutation_receipt.ts";
import { mapLinkRowToLinkListItem } from "../links/mappers.ts";
import { getLinkRowById } from "../links/queries.ts";
import { buildLinkMutationReceipt } from "../links/receipts.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";

export function removeStructuralTie(
  db: AffinityDb,
  tieId: number,
  removedAt?: number,
): LinkMutationReceipt {
  return withTransaction(db, () => {
    const row = getLinkRowById(db, tieId);
    if (!row) {
      throw new AffinityNotFoundError("link not found");
    }
    if (row.is_structural !== 1) {
      throw new AffinityInvariantError("not a structural tie");
    }
    const primary = mapLinkRowToLinkListItem(row);
    const now = resolveNow(removedAt);
    db.prepare(
      "UPDATE links SET removed_at = ?, updated_at = ? WHERE id = ?",
    ).run(now, now, tieId);
    return buildLinkMutationReceipt(primary, {
      removed: [{ kind: "link", id: tieId }],
    });
  });
}
