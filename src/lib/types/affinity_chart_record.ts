import type { AffinityChartEdge } from "./affinity_chart_edge.ts";
import type { AffinityChartNode } from "./affinity_chart_node.ts";

/** Graph projection — CONCEPT.md AffinityChartRecord. */
export interface AffinityChartRecord {
  nodes: readonly AffinityChartNode[];
  edges: readonly AffinityChartEdge[];
}
