import type { EventType } from "../../events/types.ts";
import type { AffinityListReadOptions } from "./read_list_options.ts";

/** Options for `read.getContactJournal` / `read.getLinkTimeline`. */
export type ContactJournalReadOptions = AffinityListReadOptions & {
  eventTypes?: readonly EventType[];
};
