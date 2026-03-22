import type { AttributeRecord } from "../lib/types/attribute_record.ts";
import type { DerivedLinkEffect } from "../lib/types/derived_link_effect.ts";
import type { EntityRef } from "../lib/types/entity_ref.ts";
import type { AttributeMutationReceipt } from "../lib/types/mutation_receipt.ts";

export function buildAttributeMutationReceipt(
  primary: AttributeRecord,
  partial?: {
    created?: EntityRef[];
    updated?: EntityRef[];
    archived?: EntityRef[];
    removed?: EntityRef[];
    affectedLinks?: number[];
    derivedEffects?: DerivedLinkEffect[];
  },
): AttributeMutationReceipt {
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
