import type { ContactKind } from "../contacts/types.ts";
import type { AffinityDb } from "../database.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import { assertDefaultOrdering } from "../lib/read/assert_default_ordering.ts";
import { resolveListLimitOffset } from "../lib/read/resolve_list_limit_offset.ts";
import type { ListUpcomingDatesFilters } from "../lib/types/list_upcoming_dates_filters.ts";
import type { AffinityListReadOptions } from "../lib/types/read_list_options.ts";
import type { UpcomingDateRecord } from "../lib/types/upcoming_date_record.ts";
import { utcStartOfDayMs } from "./calendar.ts";
import { mapUpcomingRowToUpcomingDateRecord } from "./mappers.ts";
import { assertValidRecurrenceKind } from "./validators.ts";

const CONTACT_KINDS = new Set<string>([
  "human",
  "group",
  "company",
  "team",
  "pet",
  "service",
  "other",
]);

function assertContactKindFilter(k: string): asserts k is ContactKind {
  if (!CONTACT_KINDS.has(k)) {
    throw new AffinityValidationError("invalid contact kind filter");
  }
}

export function listUpcomingDates(
  db: AffinityDb,
  filters?: ListUpcomingDatesFilters,
  options?: AffinityListReadOptions,
): UpcomingDateRecord[] {
  assertDefaultOrdering("listUpcomingDates", options);
  const { limit, offset } = resolveListLimitOffset(options);
  if (filters?.recurrenceKind !== undefined) {
    assertValidRecurrenceKind(filters.recurrenceKind);
  }
  if (filters?.contactKind !== undefined) {
    assertContactKindFilter(filters.contactKind);
  }
  if (filters?.horizonDays !== undefined) {
    if (!Number.isInteger(filters.horizonDays) || filters.horizonDays < 0) {
      throw new AffinityValidationError(
        "horizonDays must be a non-negative integer",
      );
    }
  }

  const clauses: string[] = ["e.deleted_at IS NULL", "e.type = 'date_anchor'"];
  const params: (string | number)[] = [];

  const since = options?.since ?? utcStartOfDayMs(Date.now());
  clauses.push("uo.occurs_on >= ?");
  params.push(since);

  let maxOccurs: number | undefined = options?.until;
  if (filters?.horizonDays !== undefined) {
    const anchor = options?.since ?? Date.now();
    const horizonEnd = anchor + filters.horizonDays * 86400000;
    maxOccurs =
      maxOccurs === undefined ? horizonEnd : Math.min(maxOccurs, horizonEnd);
  }
  if (maxOccurs !== undefined) {
    clauses.push("uo.occurs_on <= ?");
    params.push(maxOccurs);
  }

  if (filters?.recurrenceKind !== undefined) {
    clauses.push("e.recurrence_kind = ?");
    params.push(filters.recurrenceKind);
  }

  if (filters?.contactKind !== undefined) {
    clauses.push(`(
      (e.anchor_contact_id IS NOT NULL AND c_anchor.kind = ?)
      OR (e.anchor_link_id IS NOT NULL AND (c_from.kind = ? OR c_to.kind = ?))
    )`);
    params.push(filters.contactKind, filters.contactKind, filters.contactKind);
  }

  const where = clauses.join(" AND ");
  const rows = db
    .prepare(
      `SELECT e.id, e.recurrence_kind, e.summary, e.significance,
              e.anchor_contact_id, e.anchor_link_id,
              uo.occurs_on
       FROM upcoming_occurrences uo
       JOIN events e ON e.id = uo.event_id
       LEFT JOIN contacts c_anchor ON c_anchor.id = e.anchor_contact_id
       LEFT JOIN links l ON l.id = e.anchor_link_id
       LEFT JOIN contacts c_from ON c_from.id = l.from_contact_id
       LEFT JOIN contacts c_to ON c_to.id = l.to_contact_id
       WHERE ${where}
       ORDER BY uo.occurs_on ASC, e.significance DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as unknown as {
    id: number;
    recurrence_kind: string;
    summary: string;
    significance: number;
    anchor_contact_id: number | null;
    anchor_link_id: number | null;
    occurs_on: number;
  }[];
  return rows.map((r) => mapUpcomingRowToUpcomingDateRecord(r));
}
