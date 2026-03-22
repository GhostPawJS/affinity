/** Filters for `read.listDuplicateCandidates` — CONCEPT.md. */
export interface ListDuplicateCandidatesFilters {
  minScore?: number;
  exactOnly?: boolean;
  contactIds?: readonly number[];
}
