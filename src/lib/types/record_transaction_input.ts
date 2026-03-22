import type { SocialEventInput } from "./social_event_input.ts";

/** Arguments for `write.recordTransaction`. */
export interface RecordTransactionInput extends SocialEventInput {
  now?: number;
}
