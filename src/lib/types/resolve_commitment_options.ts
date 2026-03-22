import type { EventType } from "../../events/types.ts";
import type { SocialEventParticipantInput } from "./social_event_input.ts";

export interface ResolveCommitmentEventInput {
  type?: Exclude<EventType, "date_anchor">;
  occurredAt?: number;
  summary?: string;
  significance?: number;
  participants?: readonly SocialEventParticipantInput[];
  provenance?: unknown;
}

/** Optional clock and linked event data for `write.resolveCommitment`. */
export interface ResolveCommitmentOptions {
  now?: number;
  resolvingEvent?: ResolveCommitmentEventInput;
}
