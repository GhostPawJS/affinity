import type { AffinityDb } from "../database.ts";
import { assertDefaultOrdering } from "../lib/read/assert_default_ordering.ts";
import { resolveListLimitOffset } from "../lib/read/resolve_list_limit_offset.ts";
import type { ListMomentsFilters } from "../lib/types/list_moments_filters.ts";
import type { MomentRecord } from "../lib/types/moment_record.ts";
import type { AffinityListReadOptions } from "../lib/types/read_list_options.ts";
import type { EventMomentKind } from "./types.ts";

export function listMoments(
  db: AffinityDb,
  filters?: ListMomentsFilters,
  options?: AffinityListReadOptions,
): MomentRecord[] {
  assertDefaultOrdering("listMoments", options);
  const { limit, offset } = resolveListLimitOffset(options);
  const clauses: string[] = [
    "e.deleted_at IS NULL",
    "le.moment_kind IS NOT NULL",
  ];
  const params: (number | string)[] = [];
  if (options?.since !== undefined) {
    clauses.push("le.occurred_at >= ?");
    params.push(options.since);
  }
  if (options?.until !== undefined) {
    clauses.push("le.occurred_at <= ?");
    params.push(options.until);
  }
  if (filters?.contactId !== undefined) {
    clauses.push(
      "EXISTS (SELECT 1 FROM event_participants ep WHERE ep.event_id = e.id AND ep.contact_id = ?)",
    );
    params.push(filters.contactId);
  }
  if (filters?.momentKind !== undefined) {
    clauses.push("le.moment_kind = ?");
    params.push(filters.momentKind);
  }
  if (filters?.linkId !== undefined) {
    clauses.push("le.link_id = ?");
    params.push(filters.linkId);
  }
  const where = clauses.join(" AND ");
  return db
    .prepare(
      `SELECT
         e.id AS event_id,
         le.link_id,
         le.moment_kind,
         le.occurred_at,
         e.summary,
         le.impact_score
       FROM link_event_effects le
       INNER JOIN events e ON e.id = le.event_id
       WHERE ${where}
       ORDER BY le.occurred_at DESC, le.impact_score DESC, e.id DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset)
    .map((row) => ({
      eventId: (row as { event_id: number }).event_id,
      linkId: (row as { link_id: number }).link_id,
      momentKind: (row as { moment_kind: EventMomentKind }).moment_kind,
      occurredAt: (row as { occurred_at: number }).occurred_at,
      summary: (row as { summary: string }).summary,
      impactScore: (row as { impact_score: number }).impact_score,
    })) as MomentRecord[];
}
