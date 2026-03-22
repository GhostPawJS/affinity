import type { EventType } from "../../events/types.ts";
import type { CommitmentResolutionState } from "./commitment_resolution_state.ts";
import type { EventParticipantView } from "./event_participant_view.ts";

/** Promise/agreement projection — CONCEPT.md CommitmentRecord. */
export interface CommitmentRecord {
  eventId: number;
  type: EventType;
  summary: string;
  participants: readonly EventParticipantView[];
  dueAt?: number | null;
  resolutionState: CommitmentResolutionState;
}
