import type { AffinityDb } from "../database.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import { assertDefaultOrdering } from "../lib/read/assert_default_ordering.ts";
import { resolveListLimitOffset } from "../lib/read/resolve_list_limit_offset.ts";
import type { CommitmentRecord } from "../lib/types/commitment_record.ts";
import type { CommitmentResolutionState } from "../lib/types/commitment_resolution_state.ts";
import type { ListOpenCommitmentsFilters } from "../lib/types/list_open_commitments_filters.ts";
import type { AffinityListReadOptions } from "../lib/types/read_list_options.ts";
import { batchLoadEventParticipantViews } from "./loaders.ts";
import type { EventType } from "./types.ts";

const DAY_MS = 86_400_000;

function mapResolution(
  resolvedAt: number | null,
  resolution: string | null,
): CommitmentResolutionState {
  if (resolvedAt === null) {
    return "open";
  }
  if (resolution === "cancelled") {
    return "cancelled";
  }
  return "resolved";
}

export function listOpenCommitments(
  db: AffinityDb,
  filters?: ListOpenCommitmentsFilters,
  options?: AffinityListReadOptions,
): CommitmentRecord[] {
  assertDefaultOrdering("listOpenCommitments", options);
  const { limit, offset } = resolveListLimitOffset(options);
  const clauses: string[] = ["e.deleted_at IS NULL", "oc.resolved_at IS NULL"];
  const params: (number | string)[] = [];
  if (options?.since !== undefined) {
    clauses.push("e.occurred_at >= ?");
    params.push(options.since);
  }
  if (options?.until !== undefined) {
    clauses.push("e.occurred_at <= ?");
    params.push(options.until);
  }
  if (filters?.commitmentType !== undefined) {
    if (
      filters.commitmentType !== "promise" &&
      filters.commitmentType !== "agreement"
    ) {
      throw new AffinityValidationError("invalid commitmentType filter");
    }
    clauses.push("oc.commitment_type = ?");
    params.push(filters.commitmentType);
  }
  if (filters?.contactId !== undefined) {
    clauses.push(
      "EXISTS (SELECT 1 FROM event_participants ep WHERE ep.event_id = oc.event_id AND ep.contact_id = ?)",
    );
    params.push(filters.contactId);
  }
  if (filters?.linkId !== undefined) {
    clauses.push(
      "EXISTS (SELECT 1 FROM link_event_effects le WHERE le.event_id = oc.event_id AND le.link_id = ?)",
    );
    params.push(filters.linkId);
  }
  if (filters?.horizonDays !== undefined) {
    if (!Number.isInteger(filters.horizonDays) || filters.horizonDays < 0) {
      throw new AffinityValidationError(
        "horizonDays must be a non-negative integer",
      );
    }
    const anchor = options?.since ?? Date.now();
    clauses.push("oc.due_at IS NOT NULL");
    clauses.push("oc.due_at <= ?");
    params.push(anchor + filters.horizonDays * DAY_MS);
  }
  const where = clauses.join(" AND ");
  const rows = db
    .prepare(
      `SELECT oc.event_id, oc.commitment_type, oc.due_at, oc.resolved_at, oc.resolution,
              e.type, e.summary
       FROM open_commitments oc
       INNER JOIN events e ON e.id = oc.event_id
       WHERE ${where}
       ORDER BY oc.due_at IS NULL, oc.due_at ASC, oc.created_at ASC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as {
    event_id: number;
    commitment_type: string;
    due_at: number | null;
    resolved_at: number | null;
    resolution: string | null;
    type: string;
    summary: string;
  }[];
  const eventIds = rows.map((r) => r.event_id);
  const partsByEvent = batchLoadEventParticipantViews(db, eventIds);
  return rows.map((r) => ({
    eventId: r.event_id,
    type: r.type as EventType,
    summary: r.summary,
    participants: partsByEvent.get(r.event_id) ?? [],
    dueAt: r.due_at,
    resolutionState: mapResolution(r.resolved_at, r.resolution),
  }));
}
