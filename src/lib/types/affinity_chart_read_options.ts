/** Options for `read.getAffinityChart` — CONCEPT.md. */
export interface AffinityChartReadOptions {
  includeStructural?: boolean;
  includeArchived?: boolean;
  includeObserved?: boolean;
  /** Restrict the graph to a subset of contact IDs. */
  contactIds?: number[];
}
