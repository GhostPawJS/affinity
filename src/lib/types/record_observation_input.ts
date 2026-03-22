import type { SocialEventInput } from "./social_event_input.ts";

/** Arguments for `write.recordObservation`. */
export interface RecordObservationInput extends SocialEventInput {
  now?: number;
}
