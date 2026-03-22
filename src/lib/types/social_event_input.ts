import type { EventParticipantRole } from "../../events/types.ts";

/** Shared participant row for evidence writes — CONCEPT.md SocialEventInput. */
export interface SocialEventParticipantInput {
  contactId: number;
  role: EventParticipantRole;
  directionality?:
    | "owner_initiated"
    | "other_initiated"
    | "mutual"
    | "observed";
}

/** Evidence intake shape shared by interaction-style writes — CONCEPT.md. */
export interface SocialEventInput {
  occurredAt: number;
  summary: string;
  /** Significance 1..10 — enforced at write layer. */
  significance: number;
  participants: readonly SocialEventParticipantInput[];
  provenance?: unknown;
}
