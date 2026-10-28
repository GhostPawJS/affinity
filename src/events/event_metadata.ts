import type { AffinityDb } from "../database.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import type { EventRecord } from "../lib/types/event_record.ts";
import type {
  ExternalRef,
  SocialEventInput,
} from "../lib/types/social_event_input.ts";
import { loadEventRecord } from "./loaders.ts";
import { buildEventMutationReceipt } from "./receipts.ts";

export function normalizeExternalRef(ref: ExternalRef): ExternalRef {
  if (
    !ref ||
    typeof ref.source !== "string" ||
    typeof ref.id !== "string" ||
    !ref.source.trim() ||
    !ref.id.trim()
  )
    throw new AffinityValidationError(
      "external reference source and id must be non-empty strings",
    );
  return { source: ref.source.trim().toLowerCase(), id: ref.id.trim() };
}
export function deriveEventSummary(content: string): string {
  const line =
    content
      .split(/\r?\n/)
      .find((line) => line.trim())
      ?.replace(/\s+/g, " ")
      .trim() ?? "(no text)";
  return line.length > 140 ? `${line.slice(0, 139)}…` : line;
}
export function validateEventMetadata(input: Partial<SocialEventInput>): void {
  if (
    input.content !== undefined &&
    (typeof input.content !== "string" ||
      Buffer.byteLength(input.content, "utf8") > 1_048_576)
  )
    throw new AffinityValidationError(
      "content must be a string of at most 1 MB (1048576 UTF-8 bytes)",
    );
  for (const key of ["externalRef", "parentRef", "threadRef"] as const)
    if (input[key] !== undefined) input[key] = normalizeExternalRef(input[key]);
  if (input.channel !== undefined) {
    if (
      typeof input.channel !== "string" ||
      !input.channel.trim() ||
      input.channel.trim().length > 40
    )
      throw new AffinityValidationError(
        "channel must be non-empty and at most 40 characters",
      );
    input.channel = input.channel.trim().toLowerCase();
  }
  if (
    input.parentEventId !== undefined &&
    (!Number.isSafeInteger(input.parentEventId) || input.parentEventId <= 0)
  )
    throw new AffinityValidationError(
      "parentEventId must be a positive integer",
    );
  const moments = [
    "breakthrough",
    "rupture",
    "reconciliation",
    "milestone",
    "turning_point",
  ];
  if (input.momentKind !== undefined && !moments.includes(input.momentKind))
    throw new AffinityValidationError(
      `momentKind must be one of: ${moments.join(", ")}`,
    );
}
export function getEventById(
  db: AffinityDb,
  eventId: number,
): EventRecord | null {
  return db
    .prepare("SELECT 1 FROM events WHERE id=? AND deleted_at IS NULL")
    .get(eventId)
    ? loadEventRecord(db, eventId)
    : null;
}
export function getEventByExternalRef(
  db: AffinityDb,
  source: string,
  id: string,
): EventRecord | null {
  const ref = normalizeExternalRef({ source, id });
  const row = db
    .prepare(
      "SELECT id FROM events WHERE external_source=? AND external_id=? AND deleted_at IS NULL",
    )
    .get(ref.source, ref.id) as { id: number } | undefined;
  return row ? loadEventRecord(db, row.id) : null;
}
export function existingEventReceipt(db: AffinityDb, ref?: ExternalRef) {
  const event = ref && getEventByExternalRef(db, ref.source, ref.id);
  return event
    ? { ...buildEventMutationReceipt(event, {}), outcome: "no_op" as const }
    : null;
}
export function enrichEventMetadata(db: AffinityDb, record: EventRecord): void {
  if (record.parentEventId === undefined && record.parentRef) {
    const row = db
      .prepare(
        "SELECT id FROM events WHERE external_source=? AND external_id=? AND deleted_at IS NULL",
      )
      .get(record.parentRef.source, record.parentRef.id) as
      | { id: number }
      | undefined;
    if (row) record.parentEventId = row.id;
  }
  const attrs = db
    .prepare(
      "SELECT id, name, value FROM attributes WHERE event_id=? AND deleted_at IS NULL ORDER BY id",
    )
    .all(record.id) as { id: number; name: string; value: string | null }[];
  if (attrs.length)
    record.attributes = attrs.map((a) => ({
      ...a,
      contactId: null,
      linkId: null,
      eventId: record.id,
    }));
}
