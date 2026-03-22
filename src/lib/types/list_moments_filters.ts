import type { EventMomentKind } from "../../events/types.ts";

/** Supported filters for `read.listMoments` — CONCEPT.md. */
export interface ListMomentsFilters {
  momentKind?: EventMomentKind;
  contactId?: number;
  linkId?: number;
}
