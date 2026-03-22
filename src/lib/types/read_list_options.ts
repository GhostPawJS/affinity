/** Default page size for list reads — CONCEPT.md Global query contract. */
export const AFFINITY_DEFAULT_LIST_LIMIT = 50;

/** Hard cap for list reads — CONCEPT.md Global query contract. */
export const AFFINITY_MAX_LIST_LIMIT = 250;

/** Shared list-style read controls — CONCEPT.md Global query contract. */
export interface AffinityListReadOptions {
  limit?: number;
  offset?: number;
  sort?: string;
  descending?: boolean;
  includeArchived?: boolean;
  includeDormant?: boolean;
  includeObserved?: boolean;
  since?: number;
  until?: number;
}
