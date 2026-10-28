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
  occurredOn?: string;
  summary?: string;
  content?: string;
  externalRef?: ExternalRef;
  channel?: string;
  parentRef?: ExternalRef;
  parentEventId?: number;
  threadRef?: ExternalRef;
  momentKind?: import("../../events/types.ts").EventMomentKind;
  /** Significance 1..10 — enforced at write layer. */
  significance: number;
  participants: readonly SocialEventParticipantInput[];
  provenance?: unknown;
}

/** Stable external event identity. */
export interface ExternalRef {
  source: string;
  id: string;
}
