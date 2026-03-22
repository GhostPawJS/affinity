import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import * as graph from "./index.ts";

describe("graph barrel", () => {
  it("exports getAffinityChart", () => {
    strictEqual(typeof graph.getAffinityChart, "function");
  });

  it("exports refreshAllBridgeScores", () => {
    strictEqual(typeof graph.refreshAllBridgeScores, "function");
  });

  it("exports computeNodeBetweenness", () => {
    strictEqual(typeof graph.computeNodeBetweenness, "function");
  });

  it("exports normalizeToPercentiles", () => {
    strictEqual(typeof graph.normalizeToPercentiles, "function");
  });
});
