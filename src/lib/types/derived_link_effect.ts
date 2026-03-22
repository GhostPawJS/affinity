import type { EventMomentKind } from "../../events/types.ts";
import type { LinkState } from "../../links/types.ts";

/**
 * One row of link-level math returned on writes — CONCEPT.md DerivedLinkEffect.
 */
export interface DerivedLinkEffect {
  linkId: number;
  eventId: number;
  baseWeight: number;
  intensity: number;
  valence: number;
  intimacyDepth: number;
  reciprocitySignal: number;
  directness: number;
  preferenceMatch: number;
  novelty: number;
  affinityDelta: number;
  trustDelta: number;
  rankBefore: number;
  rankAfter: number;
  stateBefore: LinkState | null;
  stateAfter: LinkState | null;
  cadenceBefore: number | null;
  cadenceAfter: number | null;
  momentKind: EventMomentKind | null;
}
