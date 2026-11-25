import type { DerivedLinkEffect } from "./types/derived_link_effect.ts";
import type { EntityRef } from "./types/entity_ref.ts";

function uniqueBy<T>(
  items: readonly T[] | undefined,
  keyOf: (item: T) => string,
): T[] {
  const seen = new Set<string>();
  return (items ?? []).filter((item) => {
    const key = keyOf(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueEntityRefs(refs: readonly EntityRef[] | undefined) {
  return uniqueBy(refs, (ref) => `${ref.kind}:${ref.id}`);
}

export function normalizeMutationReceiptPartial(partial?: {
  created?: EntityRef[];
  updated?: EntityRef[];
  archived?: EntityRef[];
  removed?: EntityRef[];
  affectedLinks?: number[];
  derivedEffects?: DerivedLinkEffect[];
}): {
  created: EntityRef[];
  updated: EntityRef[];
  archived: EntityRef[];
  removed: EntityRef[];
  affectedLinks: number[];
  derivedEffects: DerivedLinkEffect[];
} {
  const derivedEffects = uniqueBy(
    partial?.derivedEffects,
    (effect) => `${effect.eventId}:${effect.linkId}`,
  );
  return {
    created: uniqueEntityRefs(partial?.created),
    updated: uniqueEntityRefs(partial?.updated),
    archived: uniqueEntityRefs(partial?.archived),
    removed: uniqueEntityRefs(partial?.removed),
    affectedLinks: [
      ...new Set([
        ...(partial?.affectedLinks ?? []),
        ...derivedEffects.map((effect) => effect.linkId),
      ]),
    ],
    derivedEffects,
  };
}
