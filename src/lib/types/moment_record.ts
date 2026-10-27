import type { EventMomentKind } from "../../events/types.ts";

/** Derived key beat — CONCEPT.md MomentRecord. */
export interface MomentRecord {
  eventId: number;
  linkId: number;
  momentKind: EventMomentKind;
  occurredAt: number;
  occurredOn?: string;
  summary: string;
  impactScore: number;
}
