import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { AffinityChartNode } from "./affinity_chart_node.ts";

describe("AffinityChartNode", () => {
  it("labels vertices", () => {
    const n: AffinityChartNode = { contactId: 1, label: "Ada", kind: "human" };
    strictEqual(n.label, "Ada");
  });
});
