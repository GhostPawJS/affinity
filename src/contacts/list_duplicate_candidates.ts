import type { AffinityDb } from "../database.ts";
import { assertDefaultOrdering } from "../lib/read/assert_default_ordering.ts";
import { resolveListLimitOffset } from "../lib/read/resolve_list_limit_offset.ts";
import type { DuplicateCandidateRecord } from "../lib/types/duplicate_candidate_record.ts";
import type { ListDuplicateCandidatesFilters } from "../lib/types/list_duplicate_candidates_filters.ts";
import type { AffinityListReadOptions } from "../lib/types/read_list_options.ts";

function pairKey(leftContactId: number, rightContactId: number): string {
  const left = Math.min(leftContactId, rightContactId);
  const right = Math.max(leftContactId, rightContactId);
  return `${left}:${right}`;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function fuzzyNameScore(left: string, right: string): number {
  if (left === right) {
    return 0.92;
  }
  if (left.length >= 3 && right.length >= 3) {
    if (left.includes(right) || right.includes(left)) {
      return 0.72;
    }
    const leftTokens = new Set(left.split(" "));
    const rightTokens = new Set(right.split(" "));
    const overlap = [...leftTokens].filter((token) =>
      rightTokens.has(token),
    ).length;
    if (overlap > 0) {
      return (overlap / Math.max(leftTokens.size, rightTokens.size)) * 0.7;
    }
  }
  return 0;
}

export function listDuplicateCandidates(
  db: AffinityDb,
  filters?: ListDuplicateCandidatesFilters,
  options?: AffinityListReadOptions,
): DuplicateCandidateRecord[] {
  assertDefaultOrdering("listDuplicateCandidates", options);
  const { limit, offset } = resolveListLimitOffset(options);
  const subset = filters?.contactIds;
  const contacts = db
    .prepare(
      `SELECT id, name
       FROM contacts
       WHERE deleted_at IS NULL
         AND lifecycle_state != 'merged'`,
    )
    .all() as { id: number; name: string }[];
  const allowedIds =
    subset === undefined
      ? null
      : new Set(subset.map((contactId) => Number(contactId)));
  const pairs = new Map<string, DuplicateCandidateRecord>();
  const exactMatches = db
    .prepare(
      `SELECT
         i1.contact_id AS left_contact_id,
         i2.contact_id AS right_contact_id,
         i1.normalized_key
       FROM identities i1
       INNER JOIN identities i2
         ON i1.normalized_key = i2.normalized_key
        AND i1.contact_id < i2.contact_id
       INNER JOIN contacts c1 ON c1.id = i1.contact_id
       INNER JOIN contacts c2 ON c2.id = i2.contact_id
       WHERE i1.removed_at IS NULL
         AND i2.removed_at IS NULL
         AND c1.deleted_at IS NULL
         AND c2.deleted_at IS NULL
         AND c1.lifecycle_state != 'merged'
         AND c2.lifecycle_state != 'merged'`,
    )
    .all() as {
    left_contact_id: number;
    right_contact_id: number;
    normalized_key: string;
  }[];
  for (const match of exactMatches) {
    if (
      allowedIds !== null &&
      (!allowedIds.has(match.left_contact_id) ||
        !allowedIds.has(match.right_contact_id))
    ) {
      continue;
    }
    pairs.set(pairKey(match.left_contact_id, match.right_contact_id), {
      leftContactId: match.left_contact_id,
      rightContactId: match.right_contact_id,
      matchReason: `exact identity ${match.normalized_key}`,
      matchScore: 1,
    });
  }
  if (filters?.exactOnly !== true) {
    for (let index = 0; index < contacts.length; index += 1) {
      const left = contacts[index];
      if (
        left === undefined ||
        (allowedIds !== null && !allowedIds.has(left.id))
      ) {
        continue;
      }
      const leftName = normalizeName(left.name);
      for (
        let offsetIndex = index + 1;
        offsetIndex < contacts.length;
        offsetIndex += 1
      ) {
        const right = contacts[offsetIndex];
        if (
          right === undefined ||
          (allowedIds !== null && !allowedIds.has(right.id))
        ) {
          continue;
        }
        const score = fuzzyNameScore(leftName, normalizeName(right.name));
        if (score <= 0) {
          continue;
        }
        const key = pairKey(left.id, right.id);
        if (!pairs.has(key)) {
          pairs.set(key, {
            leftContactId: left.id,
            rightContactId: right.id,
            matchReason: "name similarity",
            matchScore: score,
          });
        }
      }
    }
  }
  const dismissedRows = db
    .prepare("SELECT left_id, right_id FROM dismissed_duplicates")
    .all() as { left_id: number; right_id: number }[];
  const dismissedSet = new Set(
    dismissedRows.map((r) => pairKey(r.left_id, r.right_id)),
  );

  const includeDismissed = filters?.includeDismissed === true;
  for (const candidate of pairs.values()) {
    if (
      dismissedSet.has(
        pairKey(candidate.leftContactId, candidate.rightContactId),
      )
    ) {
      candidate.dismissed = true;
    }
  }

  const minScore = filters?.minScore ?? 0;
  return [...pairs.values()]
    .filter((candidate) => {
      if (candidate.matchScore < minScore) return false;
      if (candidate.dismissed === true && !includeDismissed) return false;
      return true;
    })
    .sort((left, right) => {
      const leftExact = left.matchScore === 1 ? 1 : 0;
      const rightExact = right.matchScore === 1 ? 1 : 0;
      return rightExact - leftExact || right.matchScore - left.matchScore;
    })
    .slice(offset, offset + limit);
}
