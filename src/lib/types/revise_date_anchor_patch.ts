import type { EventRecurrenceKind } from "../../events/types.ts";

/** Partial update for `write.reviseDateAnchor`. */
export interface ReviseDateAnchorPatch {
  recurrenceKind?: EventRecurrenceKind;
  anchorMonth?: number;
  anchorDay?: number;
  summary?: string;
  significance?: number;
}
