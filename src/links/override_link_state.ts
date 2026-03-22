import type { AffinityDb } from "../database.ts";
import { refreshAllBridgeScores } from "../graph/bridge_scores.ts";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import type { LinkMutationOptions } from "../lib/types/link_mutation_options.ts";
import type { LinkMutationReceipt } from "../lib/types/mutation_receipt.ts";
import { mapLinkRowToLinkListItem } from "../links/mappers.ts";
import { getLinkRowById, requireRelationalLink } from "../links/queries.ts";
import { buildLinkMutationReceipt } from "../links/receipts.ts";
import { refreshLinkRollup } from "../links/rollups.ts";
import type { LinkState } from "../links/types.ts";
import {
  assertLinkEndpointsNotMerged,
  assertValidLinkState,
  validateRelationalMechanics,
} from "../links/validators.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";

export function overrideLinkState(
  db: AffinityDb,
  linkId: number,
  state: LinkState,
  options?: LinkMutationOptions,
): LinkMutationReceipt {
  return withTransaction(db, () => {
    assertValidLinkState(state);
    const row = requireRelationalLink(db, linkId);
    assertLinkEndpointsNotMerged(db, row);
    if (row.state === state) {
      return buildLinkMutationReceipt(mapLinkRowToLinkListItem(row), {
        updated: [],
      });
    }
    validateRelationalMechanics(
      row.rank as number,
      row.affinity as number,
      row.trust as number,
      state,
    );
    const now = resolveNow(options?.now);
    db.prepare("UPDATE links SET state = ?, updated_at = ? WHERE id = ?").run(
      state,
      now,
      linkId,
    );
    refreshLinkRollup(db, linkId, now);
    if (state === "archived" || row.state === "archived") {
      refreshAllBridgeScores(db, now);
    }
    const next = getLinkRowById(db, linkId);
    if (!next) {
      throw new AffinityInvariantError("link not found after update");
    }
    return buildLinkMutationReceipt(mapLinkRowToLinkListItem(next), {
      updated: [{ kind: "link", id: linkId }],
      affectedLinks: [linkId],
    });
  });
}
