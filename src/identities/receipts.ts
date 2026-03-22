import type { DerivedLinkEffect } from "../lib/types/derived_link_effect.ts";
import type { EntityRef } from "../lib/types/entity_ref.ts";
import type { IdentityRecord } from "../lib/types/identity_record.ts";
import type { IdentityMutationReceipt } from "../lib/types/mutation_receipt.ts";

export function buildIdentityMutationReceipt(
  primary: IdentityRecord,
  partial?: {
    created?: EntityRef[];
    updated?: EntityRef[];
    archived?: EntityRef[];
    removed?: EntityRef[];
    affectedLinks?: number[];
    derivedEffects?: DerivedLinkEffect[];
  },
): IdentityMutationReceipt {
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
