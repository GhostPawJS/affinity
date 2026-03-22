import {
  getContactRowById,
  requireOwnerContactId,
} from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import type { EventType } from "../events/types.ts";
import type { DerivedLinkEffect } from "../lib/types/derived_link_effect.ts";
import type { EntityRef } from "../lib/types/entity_ref.ts";
import type { SocialEventParticipantInput } from "../lib/types/social_event_input.ts";
import { applyEventEffectToLink } from "../links/effects.ts";
import { findLiveRelationalLinkAnyDirection } from "../links/queries.ts";
import { seedSocialLink } from "../links/seed_social_link.ts";
import type { RelationalLinkKind } from "../links/types.ts";

function inferAutoLinkKind(
  db: AffinityDb,
  ownerId: number,
  otherId: number,
): RelationalLinkKind {
  const kinshipRow = db
    .prepare(
      `SELECT 1
       FROM links
       WHERE is_structural = 1
         AND removed_at IS NULL
         AND (
           (from_contact_id = ? AND to_contact_id = ?)
           OR (from_contact_id = ? AND to_contact_id = ?)
         )
         AND kind IN ('married_to', 'partner_of', 'parent_of', 'child_of', 'sibling_of')
       LIMIT 1`,
    )
    .get(ownerId, otherId, otherId, ownerId);
  if (kinshipRow !== undefined) {
    return "family";
  }
  const other = getContactRowById(db, otherId);
  switch (other?.kind) {
    case "human":
      return "personal";
    case "company":
    case "team":
      return "professional";
    case "service":
      return "service";
    default:
      return "observed";
  }
}

function ensureRelationalLink(
  db: AffinityDb,
  params: {
    fromContactId: number;
    toContactId: number;
    kind: RelationalLinkKind;
    rank?: number;
    affinity?: number;
    trust?: number;
    now: number;
  },
): { linkId: number; created: EntityRef[] } {
  const existing = findLiveRelationalLinkAnyDirection(
    db,
    params.fromContactId,
    params.toContactId,
  );
  if (existing) {
    return { linkId: existing.id, created: [] };
  }
  const created = seedSocialLink(db, {
    fromContactId: params.fromContactId,
    toContactId: params.toContactId,
    kind: params.kind,
    ...(params.rank !== undefined ? { rank: params.rank } : {}),
    ...(params.affinity !== undefined ? { affinity: params.affinity } : {}),
    ...(params.trust !== undefined ? { trust: params.trust } : {}),
    now: params.now,
  });
  return {
    linkId: created.primary.id,
    created: [{ kind: "link", id: created.primary.id }],
  };
}

export function applyJournalEventMechanics(
  db: AffinityDb,
  params: {
    eventId: number;
    eventType: EventType;
    occurredAt: number;
    significance: number;
    participants: readonly SocialEventParticipantInput[];
    provenance?: unknown;
    now: number;
  },
): {
  created: EntityRef[];
  affectedLinks: number[];
  derivedEffects: DerivedLinkEffect[];
} {
  const ownerId = requireOwnerContactId(db);
  const participantIds = params.participants.map(
    (participant) => participant.contactId,
  );
  const hasOwner = participantIds.includes(ownerId);
  const created: EntityRef[] = [];
  const effectInputs: {
    linkId: number;
    participant: SocialEventParticipantInput;
  }[] = [];

  if (hasOwner) {
    for (const participant of params.participants) {
      if (participant.contactId === ownerId) {
        continue;
      }
      const ensured = ensureRelationalLink(db, {
        fromContactId: ownerId,
        toContactId: participant.contactId,
        kind: inferAutoLinkKind(db, ownerId, participant.contactId),
        now: params.now,
      });
      created.push(...ensured.created);
      effectInputs.push({ linkId: ensured.linkId, participant });
    }
  } else if (
    params.eventType === "observation" &&
    params.participants.length === 2
  ) {
    const [first, second] = params.participants;
    if (first !== undefined && second !== undefined) {
      const a = Math.min(first.contactId, second.contactId);
      const b = Math.max(first.contactId, second.contactId);
      const ensured = ensureRelationalLink(db, {
        fromContactId: a,
        toContactId: b,
        kind: "observed",
        rank: 0,
        affinity: 0.15,
        trust: 0.35,
        now: params.now,
      });
      created.push(...ensured.created);
      effectInputs.push({
        linkId: ensured.linkId,
        participant: {
          contactId: b,
          role: second.role,
          directionality: "observed",
        },
      });
    }
  }

  const affectedLinks: number[] = [];
  const derivedEffects: DerivedLinkEffect[] = [];
  for (const input of effectInputs) {
    affectedLinks.push(input.linkId);
    derivedEffects.push(
      applyEventEffectToLink(db, {
        linkId: input.linkId,
        eventId: params.eventId,
        eventType: params.eventType,
        occurredAt: params.occurredAt,
        significance: params.significance,
        participant: input.participant,
        provenance: params.provenance,
        now: params.now,
      }),
    );
  }
  const firstMomentKind =
    derivedEffects.find((effect) => effect.momentKind !== null)?.momentKind ??
    null;
  db.prepare(
    "UPDATE events SET moment_kind = ?, updated_at = ? WHERE id = ?",
  ).run(firstMomentKind, params.now, params.eventId);
  return {
    created,
    affectedLinks,
    derivedEffects,
  };
}
