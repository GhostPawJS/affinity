import type { AffinityDb } from "../database.ts";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import type { LinkMutationOptions } from "../lib/types/link_mutation_options.ts";
import type { LinkMutationReceipt } from "../lib/types/mutation_receipt.ts";
import { mapLinkRowToLinkListItem } from "../links/mappers.ts";
import { getLinkRowById, requireRelationalLink } from "../links/queries.ts";
import { buildLinkMutationReceipt } from "../links/receipts.ts";
import { assertLinkEndpointsNotMerged } from "../links/validators.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";

function normalizeBond(bond: string | null): string | null {
  if (bond === null) {
    return null;
  }
  const t = bond.trim();
  return t.length === 0 ? null : t;
}

export function reviseBond(
  db: AffinityDb,
  linkId: number,
  bond: string | null,
  options?: LinkMutationOptions,
): LinkMutationReceipt {
  return withTransaction(db, () => {
    const row = requireRelationalLink(db, linkId);
    assertLinkEndpointsNotMerged(db, row);
    const bondNormalized = normalizeBond(bond);
    const now = resolveNow(options?.now);
    const prevBond = row.bond === null || row.bond === "" ? null : row.bond;
    if (prevBond === bondNormalized) {
      return buildLinkMutationReceipt(mapLinkRowToLinkListItem(row), {
        updated: [],
      });
    }
    db.prepare("UPDATE links SET bond = ?, updated_at = ? WHERE id = ?").run(
      bondNormalized,
      now,
      linkId,
    );
    const next = getLinkRowById(db, linkId);
    if (!next) {
      throw new AffinityInvariantError("link not found after update");
    }
    return buildLinkMutationReceipt(mapLinkRowToLinkListItem(next), {
      updated: [{ kind: "link", id: linkId }],
    });
  });
}
