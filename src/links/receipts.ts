import { normalizeMutationReceiptPartial } from "../lib/normalize_mutation_receipt.ts";
import type { DerivedLinkEffect } from "../lib/types/derived_link_effect.ts";
import type { EntityRef } from "../lib/types/entity_ref.ts";
import type { LinkListItem } from "../lib/types/link_list_item.ts";
import type { LinkMutationReceipt } from "../lib/types/mutation_receipt.ts";

export function buildLinkMutationReceipt(
  primary: LinkListItem,
  partial?: {
    created?: EntityRef[];
    updated?: EntityRef[];
    archived?: EntityRef[];
    removed?: EntityRef[];
    affectedLinks?: number[];
    derivedEffects?: DerivedLinkEffect[];
  },
): LinkMutationReceipt {
  const normalized = normalizeMutationReceiptPartial(partial);
  return {
    primary,
    created: normalized.created,
    updated: normalized.updated,
    archived: normalized.archived,
    removed: normalized.removed,
    affectedLinks: normalized.affectedLinks,
    derivedEffects: normalized.derivedEffects,
  };
}
