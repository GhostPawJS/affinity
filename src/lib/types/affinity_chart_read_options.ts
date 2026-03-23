/** Options for `read.getAffinityChart` — CONCEPT.md. */
export interface AffinityChartReadOptions {
  includeArchived?: boolean;
  includeObserved?: boolean;
  /** Restrict the graph to a subset of contact IDs. */
  contactIds?: number[];
}
