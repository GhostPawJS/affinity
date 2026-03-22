import type { SocialEventInput } from "./social_event_input.ts";

/** Arguments for `write.recordCommitment`. */
export interface RecordCommitmentInput extends SocialEventInput {
  commitmentType: "promise" | "agreement";
  dueAt?: number | null;
  now?: number;
}
