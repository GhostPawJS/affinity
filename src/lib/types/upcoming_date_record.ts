import type { EventRecurrenceKind } from "../../events/types.ts";
import type { EntityRef } from "./entity_ref.ts";

export type UpcomingDateTargetRef = Extract<
  EntityRef,
  { kind: "contact" | "link" }
>;

/** Next anchored calendar occurrence — CONCEPT.md UpcomingDateRecord. */
export interface UpcomingDateRecord {
  anchorEventId: number;
  targetRef: UpcomingDateTargetRef;
  recurrenceKind: EventRecurrenceKind;
  /** Epoch milliseconds for the materialized next occurrence (sorting key). */
  occursOn: number;
  summary: string;
  significance: number;
}
