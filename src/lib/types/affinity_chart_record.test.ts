import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { AffinityChartRecord } from "./affinity_chart_record.ts";

describe("AffinityChartRecord", () => {
  it("pairs nodes and edges", () => {
    const g: AffinityChartRecord = { nodes: [], edges: [] };
    strictEqual(g.nodes.length, 0);
  });
});
