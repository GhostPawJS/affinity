import type { ContactKind } from "../../contacts/types.ts";
import type { EventRecurrenceKind } from "../../events/types.ts";

/** Filters for `read.listUpcomingDates` — CONCEPT.md maintenance list. */
export interface ListUpcomingDatesFilters {
  recurrenceKind?: EventRecurrenceKind;
  contactKind?: ContactKind;
  /** Max days ahead from the horizon anchor (`options.since` or now). */
  horizonDays?: number;
}
