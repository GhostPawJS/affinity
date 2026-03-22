import type { AffinityDb } from "../database.ts";
import { loadEventParticipantViews } from "../events/loaders.ts";
import type { EventType } from "../events/types.ts";
import type { CommitmentRecord } from "../lib/types/commitment_record.ts";
import type { CommitmentResolutionState } from "../lib/types/commitment_resolution_state.ts";
import type { AffinityListReadOptions } from "../lib/types/read_list_options.ts";
import { resolveListLimitOffset } from "./resolve_list_limit_offset.ts";

function mapResolution(
  resolvedAt: number | null,
  resolution: string | null,
): CommitmentResolutionState | null {
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
  _filters?: unknown,
  options?: AffinityListReadOptions,
): CommitmentRecord[] {
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
  const where = clauses.join(" AND ");
  const rows = db
    .prepare(
      `SELECT oc.event_id, oc.commitment_type, oc.due_at, oc.resolved_at, oc.resolution,
              e.type, e.summary
       FROM open_commitments oc
       INNER JOIN events e ON e.id = oc.event_id
       WHERE ${where}
       ORDER BY oc.due_at IS NULL, oc.due_at ASC, oc.created_at ASC`,
    )
    .all(...params) as {
    event_id: number;
    commitment_type: string;
    due_at: number | null;
    resolved_at: number | null;
    resolution: string | null;
    type: string;
    summary: string;
  }[];
  const sliced = rows.slice(offset, offset + limit);
  const out: CommitmentRecord[] = [];
  for (const r of sliced) {
    const participants = loadEventParticipantViews(db, r.event_id);
    out.push({
      eventId: r.event_id,
      type: r.type as EventType,
      summary: r.summary,
      participants,
      dueAt: r.due_at,
      resolutionState: mapResolution(r.resolved_at, r.resolution),
    });
  }
  return out;
}
