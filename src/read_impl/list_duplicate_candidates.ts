import type { AffinityDb } from "../database.ts";
import type { DuplicateCandidateRecord } from "../lib/types/duplicate_candidate_record.ts";

/**
 * Returns an empty list until fuzzy dedupe + identity index surfaces are wired (CONCEPT.md).
 */
export function listDuplicateCandidates(
  _db: AffinityDb,
  _filters?: unknown,
  _options?: unknown,
): DuplicateCandidateRecord[] {
  return [];
}
