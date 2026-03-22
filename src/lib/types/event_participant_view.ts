import type { EventParticipantRole } from "../../events/types.ts";

/** Participant row embedded in journal reads — aligns with SocialEventInput participants. */
export interface EventParticipantView {
  contactId: number;
  role: EventParticipantRole;
  directionality?:
    | "owner_initiated"
    | "other_initiated"
    | "mutual"
    | "observed";
}
