import type { SocialEventInput } from "./social_event_input.ts";

/** Arguments for `write.recordMilestone`. */
export interface RecordMilestoneInput extends SocialEventInput {
  now?: number;
}
