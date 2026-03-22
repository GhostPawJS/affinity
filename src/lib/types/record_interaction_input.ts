import type { SocialEventInput } from "./social_event_input.ts";

/** Subset of `EventType` allowed for `write.recordInteraction` — CONCEPT.md. */
export type InteractionEventType =
  | "conversation"
  | "activity"
  | "gift"
  | "support"
  | "conflict"
  | "correction";

/** Arguments for `write.recordInteraction`. */
export interface RecordInteractionInput extends SocialEventInput {
  type: InteractionEventType;
  now?: number;
}
