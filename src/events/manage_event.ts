import type { AffinityDb } from "../database.ts";
import { AffinityConflictError } from "../lib/errors/affinity_conflict_error.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import type { ExternalRef } from "../lib/types/social_event_input.ts";
import { withTransaction } from "../with_transaction.ts";
import {
  getEventByExternalRef,
  getEventById,
  validateEventMetadata,
} from "./event_metadata.ts";
import { replayEventLinks } from "./event_replay.ts";
import { buildEventMutationReceipt } from "./receipts.ts";
import type { EventType } from "./types.ts";
import { assertFiniteTimestamp } from "./validators.ts";
export type EventTarget = number | { eventId?: number; ref?: ExternalRef };
export interface ReviseEventPatch {
  summary?: string;
  content?: string;
  occurredAt?: number;
  significance?: number;
  channel?: string;
  type?: EventType;
  externalRef?: ExternalRef;
}
export function requireEventTarget(db: AffinityDb, target: EventTarget) {
  const selector = typeof target === "number" ? { eventId: target } : target;
  if (
    !selector ||
    (selector.eventId === undefined) === (selector.ref === undefined)
  )
    throw new AffinityValidationError("Provide exactly one of eventId or ref");
  const event = selector.ref
    ? getEventByExternalRef(db, selector.ref.source, selector.ref.id)
    : getEventById(db, selector.eventId as number);
  if (!event) throw new AffinityNotFoundError("event not found");
  return event;
}
function affected(db: AffinityDb, id: number): number[] {
  return (
    db
      .prepare("SELECT link_id FROM link_event_effects WHERE event_id=?")
      .all(id) as { link_id: number }[]
  ).map((r) => r.link_id);
}
export function reviseEvent(
  db: AffinityDb,
  target: EventTarget,
  patch: ReviseEventPatch,
) {
  return withTransaction(db, () => {
    const allowed = [
      "summary",
      "content",
      "occurredAt",
      "significance",
      "channel",
      "type",
      "externalRef",
    ];
    for (const key of Object.keys(patch))
      if (!allowed.includes(key))
        throw new AffinityValidationError(
          `unknown patch key ${key}; allowed keys: ${allowed.join(", ")}`,
        );
    const event = requireEventTarget(db, target);
    const next = { ...event, ...patch };
    const { momentKind: _momentKind, ...metadata } = next;
    validateEventMetadata(metadata);
    Object.assign(next, metadata);
    if (
      patch.summary !== undefined &&
      (typeof patch.summary !== "string" || !patch.summary.trim())
    )
      throw new AffinityValidationError("summary must be non-empty");
    if (patch.occurredAt !== undefined)
      assertFiniteTimestamp(patch.occurredAt, "occurredAt");
    if (
      !Number.isInteger(next.significance) ||
      next.significance < 1 ||
      next.significance > 10
    )
      throw new AffinityValidationError(
        "significance must be an integer from 1 to 10",
      );
    const interactions = [
      "conversation",
      "activity",
      "gift",
      "support",
      "conflict",
      "correction",
    ];
    if (
      next.type !== event.type &&
      !(
        interactions.includes(event.type) && interactions.includes(next.type)
      ) &&
      !(
        ["promise", "agreement"].includes(event.type) &&
        ["promise", "agreement"].includes(next.type)
      )
    )
      throw new AffinityValidationError(
        "type must stay within the same event kind",
      );
    if (patch.externalRef && event.externalRef)
      throw new AffinityConflictError(
        "externalRef can only be set when absent",
      );
    if (
      patch.externalRef &&
      next.externalRef &&
      getEventByExternalRef(db, next.externalRef.source, next.externalRef.id)
    )
      throw new AffinityConflictError(
        "externalRef already belongs to an event",
      );
    const now = Date.now();
    const links = affected(db, event.id);
    db.prepare(
      "UPDATE events SET summary=?,content=?,occurred_at=?,occurred_on=?,significance=?,channel=?,type=?,external_source=?,external_id=?,updated_at=? WHERE id=?",
    ).run(
      next.summary.trim(),
      next.content ?? null,
      next.occurredAt,
      patch.occurredAt === undefined
        ? (event.occurredOn ?? null)
        : new Date(next.occurredAt).toISOString().slice(0, 10),
      next.significance,
      next.channel ?? null,
      next.type,
      next.externalRef?.source ?? null,
      next.externalRef?.id ?? null,
      now,
      event.id,
    );
    if (patch.type && ["promise", "agreement"].includes(patch.type))
      db.prepare(
        "UPDATE open_commitments SET commitment_type=? WHERE event_id=?",
      ).run(patch.type, event.id);
    if (
      patch.significance !== undefined ||
      patch.type !== undefined ||
      patch.occurredAt !== undefined
    )
      replayEventLinks(db, links, now);
    return buildEventMutationReceipt(requireEventTarget(db, event.id), {
      updated: [{ kind: "event", id: event.id }],
      affectedLinks: links,
    });
  });
}
export function deleteEvent(
  db: AffinityDb,
  target: EventTarget,
  options: { confirm: boolean },
) {
  return withTransaction(db, () => {
    if (options?.confirm !== true)
      throw new AffinityValidationError("deleteEvent requires confirm: true");
    const event = requireEventTarget(db, target);
    const links = affected(db, event.id);
    // Explicit cleanup also works for caller-owned connections with foreign_keys disabled.
    for (const table of [
      "event_participants",
      "attributes",
      "open_commitments",
      "upcoming_occurrences",
      "link_event_effects",
    ])
      db.prepare(`DELETE FROM ${table} WHERE event_id=?`).run(event.id);
    db.prepare(
      "UPDATE events SET parent_event_id=NULL WHERE parent_event_id=?",
    ).run(event.id);
    db.prepare("DELETE FROM events WHERE id=?").run(event.id);
    replayEventLinks(db, links, Date.now());
    return buildEventMutationReceipt(event, {
      removed: [{ kind: "event", id: event.id }],
      affectedLinks: links,
    });
  });
}
