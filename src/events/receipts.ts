import { normalizeMutationReceiptPartial } from "../lib/normalize_mutation_receipt.ts";
import type { DerivedLinkEffect } from "../lib/types/derived_link_effect.ts";
import type { EntityRef } from "../lib/types/entity_ref.ts";
import type { EventRecord } from "../lib/types/event_record.ts";
import type { EventMutationReceipt } from "../lib/types/mutation_receipt.ts";

export function buildEventMutationReceipt(
  primary: EventRecord,
  partial?: {
    warnings?: { code: "future_event"; message: string }[] | undefined;
    created?: EntityRef[];
    updated?: EntityRef[];
    archived?: EntityRef[];
    removed?: EntityRef[];
    affectedLinks?: number[];
    derivedEffects?: DerivedLinkEffect[];
  },
): EventMutationReceipt {
  const normalized = normalizeMutationReceiptPartial(partial);
  return {
    primary,
    ...(partial?.warnings ? { warnings: partial.warnings } : {}),
    created: normalized.created,
    updated: normalized.updated,
    archived: normalized.archived,
    removed: normalized.removed,
    affectedLinks: normalized.affectedLinks,
    derivedEffects: normalized.derivedEffects,
  };
}
