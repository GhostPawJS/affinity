import type { DerivedLinkEffect } from "./types/derived_link_effect.ts";
import type { EntityRef } from "./types/entity_ref.ts";

function uniqueEntityRefs(refs: readonly EntityRef[] | undefined): EntityRef[] {
  const out: EntityRef[] = [];
  const seen = new Set<string>();
  for (const ref of refs ?? []) {
    const key = `${ref.kind}:${ref.id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(ref);
  }
  return out;
}

function uniqueDerivedEffects(
  effects: readonly DerivedLinkEffect[] | undefined,
): DerivedLinkEffect[] {
  const out: DerivedLinkEffect[] = [];
  const seen = new Set<string>();
  for (const effect of effects ?? []) {
    const key = `${effect.eventId}:${effect.linkId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(effect);
  }
  return out;
}

function uniqueAffectedLinks(
  affectedLinks: readonly number[] | undefined,
  derivedEffects: readonly DerivedLinkEffect[],
): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const linkId of affectedLinks ?? []) {
    if (seen.has(linkId)) {
      continue;
    }
    seen.add(linkId);
    out.push(linkId);
  }
  for (const effect of derivedEffects) {
    if (seen.has(effect.linkId)) {
      continue;
    }
    seen.add(effect.linkId);
    out.push(effect.linkId);
  }
  return out;
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
  const derivedEffects = uniqueDerivedEffects(partial?.derivedEffects);
  return {
    created: uniqueEntityRefs(partial?.created),
    updated: uniqueEntityRefs(partial?.updated),
    archived: uniqueEntityRefs(partial?.archived),
    removed: uniqueEntityRefs(partial?.removed),
    affectedLinks: uniqueAffectedLinks(partial?.affectedLinks, derivedEffects),
    derivedEffects,
  };
}
