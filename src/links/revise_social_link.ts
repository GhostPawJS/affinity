import type { AffinityDb } from "../database.ts";
import { replayEventLinks } from "../events/event_replay.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import type { LinkMutationOptions } from "../lib/types/link_mutation_options.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";
import { mapLinkRowToLinkListItem } from "./mappers.ts";
import { baselineCadenceDays } from "./mechanics.ts";
import { requireRelationalLink } from "./queries.ts";
import { buildLinkMutationReceipt } from "./receipts.ts";
import { refreshLinkRollup } from "./rollups.ts";
import type { LinkState, RelationalLinkKind } from "./types.ts";
import {
  assertLinkEndpointsNotMerged,
  validateRelationalMechanics,
} from "./validators.ts";

export interface ReviseSocialLinkPatch {
  rank?: number;
  affinity?: number;
  trust?: number;
  bond?: string | null;
  state?: LinkState;
  cadenceDays?: number | null;
}

export function reviseSocialLink(
  db: AffinityDb,
  linkId: number,
  patch: ReviseSocialLinkPatch,
  options?: LinkMutationOptions,
) {
  return withTransaction(db, () => {
    const row = requireRelationalLink(db, linkId);
    assertLinkEndpointsNotMerged(db, row);
    for (const key of Object.keys(patch))
      if (
        !["rank", "affinity", "trust", "bond", "state", "cadenceDays"].includes(
          key,
        )
      )
        throw new AffinityValidationError(`unknown link patch key: ${key}`);
    const cadence = patch.cadenceDays;
    if (cadence != null && (!Number.isFinite(cadence) || cadence <= 0))
      throw new AffinityValidationError(
        "cadenceDays must be a positive number",
      );
    const rank = patch.rank ?? row.rank;
    const affinity = patch.affinity ?? row.affinity;
    const trust = patch.trust ?? row.trust;
    const state = patch.state ?? row.state;
    validateRelationalMechanics(
      rank as number,
      affinity as number,
      trust as number,
      state as LinkState,
    );
    const bond =
      patch.bond === undefined ? row.bond : patch.bond?.trim() || null;
    const pinned =
      cadence === undefined ? (row.pinned_cadence_days ?? null) : cadence;
    if (
      rank === row.rank &&
      affinity === row.affinity &&
      trust === row.trust &&
      state === row.state &&
      bond === row.bond &&
      pinned === (row.pinned_cadence_days ?? null)
    )
      return buildLinkMutationReceipt(mapLinkRowToLinkListItem(row), {});
    const now = resolveNow(options?.now);
    db.prepare(
      "UPDATE links SET rank=?,affinity=?,trust=?,state=?,bond=?,pinned_cadence_days=?,cadence_days=?,updated_at=? WHERE id=?",
    ).run(
      rank,
      affinity,
      trust,
      state,
      bond,
      pinned,
      pinned ?? row.cadence_days,
      now,
      linkId,
    );
    if (cadence === null) {
      // Replay surviving evidence from its baseline to restore the derived rhythm.
      db.prepare("UPDATE links SET cadence_days=NULL WHERE id=?").run(linkId);
      replayEventLinks(db, [linkId], now);
      const derived = requireRelationalLink(db, linkId);
      if (derived.cadence_days === null)
        db.prepare("UPDATE links SET cadence_days=? WHERE id=?").run(
          baselineCadenceDays(row.kind as RelationalLinkKind),
          linkId,
        );
      db.prepare(
        "UPDATE links SET rank=?,affinity=?,trust=?,state=? WHERE id=?",
      ).run(rank, affinity, trust, state, linkId);
    }
    refreshLinkRollup(db, linkId, now);
    return buildLinkMutationReceipt(
      mapLinkRowToLinkListItem(requireRelationalLink(db, linkId)),
      {
        updated: [{ kind: "link", id: linkId }],
      },
    );
  });
}
