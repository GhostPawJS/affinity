import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeNodeBetweenness,
  normalizeToPercentiles,
} from "./betweenness.ts";

describe("computeNodeBetweenness", () => {
  it("returns empty map for empty graph", () => {
    const result = computeNodeBetweenness(new Map());
    strictEqual(result.size, 0);
  });

  it("returns zero for single node", () => {
    const adj = new Map([[1, [] as number[]]]);
    const result = computeNodeBetweenness(adj);
    strictEqual(result.get(1), 0);
  });

  it("returns zero for two connected nodes", () => {
    const adj = new Map<number, number[]>([
      [1, [2]],
      [2, [1]],
    ]);
    const result = computeNodeBetweenness(adj);
    strictEqual(result.get(1), 0);
    strictEqual(result.get(2), 0);
  });

  it("gives highest betweenness to middle node in linear chain", () => {
    // 1 -- 2 -- 3 -- 4 -- 5
    const adj = new Map<number, number[]>([
      [1, [2]],
      [2, [1, 3]],
      [3, [2, 4]],
      [4, [3, 5]],
      [5, [4]],
    ]);
    const result = computeNodeBetweenness(adj);
    const scores = [...result.entries()].sort((a, b) => b[1] - a[1]);
    const topScore = scores[0];
    strictEqual(topScore?.[0], 3);
    const node3 = result.get(3);
    const node2 = result.get(2);
    const node4 = result.get(4);
    const node1 = result.get(1);
    ok(node3 !== undefined && node2 !== undefined && node3 > node2);
    ok(node3 !== undefined && node4 !== undefined && node3 > node4);
    ok(node2 !== undefined && node1 !== undefined && node2 > node1);
  });

  it("gives highest betweenness to center of star graph", () => {
    // center=1 connected to 2,3,4,5
    const adj = new Map<number, number[]>([
      [1, [2, 3, 4, 5]],
      [2, [1]],
      [3, [1]],
      [4, [1]],
      [5, [1]],
    ]);
    const result = computeNodeBetweenness(adj);
    const centerScore = result.get(1);
    ok(centerScore !== undefined && centerScore > 0);
    strictEqual(result.get(2), 0);
    strictEqual(result.get(3), 0);
    strictEqual(result.get(4), 0);
    strictEqual(result.get(5), 0);
  });

  it("identifies bridge node between two clusters", () => {
    // Cluster A: 1-2-3 fully connected
    // Cluster B: 5-6-7 fully connected
    // Bridge: 4 connects 3 and 5
    const adj = new Map<number, number[]>([
      [1, [2, 3]],
      [2, [1, 3]],
      [3, [1, 2, 4]],
      [4, [3, 5]],
      [5, [4, 6, 7]],
      [6, [5, 7]],
      [7, [5, 6]],
    ]);
    const result = computeNodeBetweenness(adj);
    const bridge = result.get(4);
    ok(bridge !== undefined);
    for (const id of [1, 2, 6, 7]) {
      const score = result.get(id);
      ok(
        bridge !== undefined && score !== undefined && bridge > score,
        `bridge (${bridge}) > node ${id} (${result.get(id)})`,
      );
    }
  });

  it("returns zero for disconnected nodes", () => {
    const adj = new Map<number, number[]>([
      [1, [2]],
      [2, [1]],
      [3, [4]],
      [4, [3]],
    ]);
    const result = computeNodeBetweenness(adj);
    strictEqual(result.get(1), 0);
    strictEqual(result.get(2), 0);
    strictEqual(result.get(3), 0);
    strictEqual(result.get(4), 0);
  });
});

describe("normalizeToPercentiles", () => {
  it("returns empty map for empty input", () => {
    const result = normalizeToPercentiles(new Map());
    strictEqual(result.size, 0);
  });

  it("returns 0 for single node", () => {
    const result = normalizeToPercentiles(new Map([[1, 5]]));
    strictEqual(result.get(1), 0);
  });

  it("assigns 0 and 1 to two distinct scores", () => {
    const result = normalizeToPercentiles(
      new Map([
        [1, 0],
        [2, 10],
      ]),
    );
    strictEqual(result.get(1), 0);
    strictEqual(result.get(2), 1);
  });

  it("assigns evenly spaced percentiles", () => {
    const result = normalizeToPercentiles(
      new Map([
        [1, 0],
        [2, 5],
        [3, 10],
        [4, 15],
        [5, 20],
      ]),
    );
    deepStrictEqual(
      [...result.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v),
      [0, 0.25, 0.5, 0.75, 1],
    );
  });
});
