import type { EventRecurrenceKind } from "../../events/types.ts";

export type DateAnchorTarget =
  | { kind: "contact"; contactId: number }
  | { kind: "link"; linkId: number };

/** Arguments for `write.addDateAnchor`. */
export interface AddDateAnchorInput {
  target: DateAnchorTarget;
  recurrenceKind: EventRecurrenceKind;
  anchorMonth: number;
  anchorDay: number;
  summary: string;
  significance: number;
  now?: number;
  /** When true, skip duplicate (same recurrence + calendar + target) checks. */
  force?: boolean;
}
