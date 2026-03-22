import type { DerivedLinkEffect } from "../lib/types/derived_link_effect.ts";
import type { EntityRef } from "../lib/types/entity_ref.ts";
import type { EventRecord } from "../lib/types/event_record.ts";
import type { EventMutationReceipt } from "../lib/types/mutation_receipt.ts";

export function buildEventMutationReceipt(
  primary: EventRecord,
  partial?: {
    created?: EntityRef[];
    updated?: EntityRef[];
    archived?: EntityRef[];
    removed?: EntityRef[];
    affectedLinks?: number[];
    derivedEffects?: DerivedLinkEffect[];
  },
): EventMutationReceipt {
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
