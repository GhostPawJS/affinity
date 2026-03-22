/**
 * Brandes' algorithm for unweighted node betweenness centrality.
 *
 * Reference: Brandes, U. (2001). "A Faster Algorithm for Betweenness Centrality."
 * Journal of Mathematical Sociology, 25(2), 163–177.
 */

/**
 * Compute raw node betweenness centrality for an undirected unweighted graph.
 *
 * @param adjacency - Map from node ID to array of neighbor IDs (undirected)
 * @returns Map from node ID to raw betweenness score
 */
export function computeNodeBetweenness(
  adjacency: ReadonlyMap<number, readonly number[]>,
): Map<number, number> {
  const nodes = [...adjacency.keys()];
  const n = nodes.length;
  const cb = new Map<number, number>();
  for (const v of nodes) {
    cb.set(v, 0);
  }
  if (n <= 2) {
    return cb;
  }

  for (const s of nodes) {
    const stack: number[] = [];
    const pred = new Map<number, number[]>();
    for (const v of nodes) {
      pred.set(v, []);
    }

    const sigma = new Map<number, number>();
    for (const v of nodes) {
      sigma.set(v, 0);
    }
    sigma.set(s, 1);

    const dist = new Map<number, number>();
    for (const v of nodes) {
      dist.set(v, -1);
    }
    dist.set(s, 0);

    const queue: number[] = [s];
    let head = 0;

    while (head < queue.length) {
      const v = queue[head++]!;
      stack.push(v);
      const dv = dist.get(v)!;

      for (const w of adjacency.get(v) ?? []) {
        const dw = dist.get(w)!;
        if (dw < 0) {
          dist.set(w, dv + 1);
          queue.push(w);
        }
        if (dist.get(w) === dv + 1) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          pred.get(w)!.push(v);
        }
      }
    }

    const delta = new Map<number, number>();
    for (const v of nodes) {
      delta.set(v, 0);
    }

    while (stack.length > 0) {
      const w = stack.pop()!;
      const sigmaW = sigma.get(w)!;
      const deltaW = delta.get(w)!;
      for (const v of pred.get(w)!) {
        const share = (sigma.get(v)! / sigmaW) * (1 + deltaW);
        delta.set(v, delta.get(v)! + share);
      }
      if (w !== s) {
        cb.set(w, cb.get(w)! + delta.get(w)!);
      }
    }
  }

  // Undirected graph: each pair counted twice, divide by 2
  for (const v of nodes) {
    cb.set(v, cb.get(v)! / 2);
  }

  return cb;
}

/**
 * Normalize raw betweenness scores to percentile ranks in [0, 1].
 *
 * Ties share the same percentile. A single-node graph returns percentile 0.
 */
export function normalizeToPercentiles(
  scores: ReadonlyMap<number, number>,
): Map<number, number> {
  const entries = [...scores.entries()];
  const n = entries.length;
  if (n <= 1) {
    const result = new Map<number, number>();
    for (const [id] of entries) {
      result.set(id, 0);
    }
    return result;
  }

  entries.sort((a, b) => a[1] - b[1]);

  const result = new Map<number, number>();
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n && entries[j]![1] === entries[i]![1]) {
      j++;
    }
    const tiePercentile = ((i + j - 1) / 2) / (n - 1);
    for (let k = i; k < j; k++) {
      result.set(entries[k]![0], tiePercentile);
    }
    i = j;
  }
  return result;
}
