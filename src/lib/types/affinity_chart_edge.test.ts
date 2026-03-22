import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { AffinityChartEdge } from "./affinity_chart_edge.ts";

describe("AffinityChartEdge", () => {
  it("stores derived edge weight", () => {
    const e: AffinityChartEdge = {
      linkId: 1,
      fromContactId: 1,
      toContactId: 2,
      weight: 0.5,
    };
    strictEqual(e.weight, 0.5);
  });
});
