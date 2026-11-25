import { normalizeMutationReceiptPartial } from "../lib/normalize_mutation_receipt.ts";
import type { ContactListItem } from "../lib/types/contact_list_item.ts";
import type { DerivedLinkEffect } from "../lib/types/derived_link_effect.ts";
import type { EntityRef } from "../lib/types/entity_ref.ts";
import type { MergePrimary } from "../lib/types/merge_primary.ts";
import type {
  ContactMutationReceipt,
  MergeReceipt,
} from "../lib/types/mutation_receipt.ts";

export function buildContactMutationReceipt(
  primary: ContactListItem,
  partial?: {
    created?: EntityRef[];
    updated?: EntityRef[];
    archived?: EntityRef[];
    removed?: EntityRef[];
    affectedLinks?: number[];
    derivedEffects?: DerivedLinkEffect[];
  },
): ContactMutationReceipt {
  return {
    primary,
    ...normalizeMutationReceiptPartial(partial),
  };
}

export function buildMergeMutationReceipt(
  primary: MergePrimary,
  partial?: {
    created?: EntityRef[];
    updated?: EntityRef[];
    archived?: EntityRef[];
    removed?: EntityRef[];
    affectedLinks?: number[];
    derivedEffects?: DerivedLinkEffect[];
  },
): MergeReceipt {
  return {
    primary,
    ...normalizeMutationReceiptPartial(partial),
  };
}
