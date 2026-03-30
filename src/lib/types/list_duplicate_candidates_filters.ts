/** Filters for `read.listDuplicateCandidates` — CONCEPT.md. */
export interface ListDuplicateCandidatesFilters {
  minScore?: number;
  exactOnly?: boolean;
  contactIds?: readonly number[];
  /** When true, dismissed pairs are included in results (marked with dismissed: true). Default false. */
  includeDismissed?: boolean;
}
