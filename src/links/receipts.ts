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
  return {
    primary,
    created: partial?.created ?? [],
    updated: partial?.updated ?? [],
    archived: partial?.archived ?? [],
    removed: partial?.removed ?? [],
    affectedLinks: partial?.affectedLinks ?? [],
    derivedEffects: partial?.derivedEffects ?? [],
  };
}
