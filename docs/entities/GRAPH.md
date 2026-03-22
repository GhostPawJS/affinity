# `graph`

## What It Is

`graph` is the world-view projection of the operator's relationship network.

The Affinity Chart is a read-only graph derived from contacts and links. It
produces an `AffinityChartRecord` with `nodes` (contacts) and `edges`
(relational links), weighted by a formula that blends trust and rank. There are
no dedicated graph writes — the chart is always a live projection of current
state.

## Why It Exists

Individual contact profiles and link details are useful for focused work, but
relationship management also requires a bird's-eye view. Which contacts are
central? Which relationships cluster together? Where are the weak ties and
bridge connections?

Graph visualization is a well-studied approach to this problem
([social network analysis](https://en.wikipedia.org/wiki/Social_network_analysis)),
but raw graph dumps are unusable without meaningful edge weights. The Affinity
Chart solves this by computing a weight for each edge that reflects both
reliability (trust) and depth (rank), giving layout algorithms and consumers
the signal they need to produce useful topology.

`graph` exists so the system has:

- one read that projects the entire relationship network
- weighted edges that reflect real relationship quality
- a foundation for visualization, clustering, and network analysis
- clean filtering for focus (contact subsets, observed/archived inclusion)

## How To Use It

1. `read.getAffinityChart(db, options?)` — retrieve the full graph.
2. Pass `nodes` and `edges` to a layout engine (force-directed, hierarchical,
   or radial) for visualization.
3. Use `options` to filter: include or exclude archived links, observed links,
   or restrict to a contact subset.

The chart is read-only and always reflects current state. Changes to contacts,
links, or evidence are automatically reflected on the next read.

## Good Uses

- rendering a visual relationship map
- identifying clusters of closely connected contacts
- finding bridge contacts who connect separate social circles
- network analysis for outreach planning
- detecting isolated or peripheral contacts

## Do Not Use It For

- modifying relationships — use link writes in [`links`](LINKS.md)
- detailed relationship inspection — use `read.getLinkDetail()` in
  [`links`](LINKS.md)
- event history — use journal and timeline reads in [`events`](EVENTS.md)

The graph answers "what does my network look like?" — not "what should I do
about it?" (that's Radar) or "what happened?" (that's the Journal).

## Nodes

Nodes are contacts in `active` or `dormant` lifecycle states. Excluded:

- contacts in `merged` state (absorbed into another node)
- contacts in `lost` state (retired from the network)

Each node carries the contact's identifying information (`id`, `name`, `kind`,
`lifecycleState`) for rendering.

## Edges

Edges are non-archived relational links. Structural ties are not included —
the graph models lived relational dynamics, not declared facts.

Each edge carries:

- `linkId`, `fromContactId`, `toContactId`
- `kind` (relational kind)
- `state` (link state)
- `weight` (computed edge weight)
- `bridgeScore` (betweenness centrality percentile of the counterparty)

## Edge Weight Formula

```
edge_weight = trust * (0.6 + 0.4 * normalized_rank)
```

Where `normalized_rank = 1 - exp(-rank / 4)`.

This means:

- **trust dominates**: a high-trust, low-rank link weighs more than a
  high-rank, low-trust one
- **rank amplifies**: deeper relationships (higher rank) get a bonus up to 40%
  on top of the trust baseline
- **zero trust = zero weight**: a completely untrusted link has no edge weight
  regardless of rank
- **rank saturates**: due to the exponential decay in `normalized_rank`, the
  marginal weight gain from rank diminishes at higher levels

## Bridge Scores

Each edge includes a `bridgeScore` — the betweenness centrality percentile of
the counterparty contact. This measures how much the contact at the other end
of the relationship spans different parts of the social network.

The system uses
[Brandes' algorithm](https://doi.org/10.1080/0022250X.2001.9990249) to compute
node betweenness centrality across the active contact graph, then normalizes
the raw scores to percentile ranks in `[0, 1]`. A contact with `bridgeScore`
near 1.0 connects clusters that would otherwise be disconnected — they are a
social bridge.

Bridge scores are recomputed when the graph topology changes: new link creation
(auto or manual), link archive/restore, and contact merges. They feed into the
Radar score formula at 10% weight, giving bridge contacts slightly higher
maintenance priority.

## Filtering Options

| Option | Effect |
|---|---|
| `includeArchived` | include archived links as edges (default: excluded) |
| `includeObserved` | include `observed`-kind links as edges (default: excluded) |
| contact subset | restrict nodes and edges to a specific set of contact IDs |

## Related Tables

- [`contacts`](CONTACTS.md): nodes in the graph
- [`links`](LINKS.md): edges in the graph, with progression mechanics that
  determine edge weight

## Public APIs

### Writes

None. The graph is a derived projection with no dedicated writes.

### Reads

- `read.getAffinityChart(db, options?)`: returns an `AffinityChartRecord`
  containing `nodes` (active/dormant contacts) and `edges` (non-archived
  relational links with computed weights). Filterable by archived inclusion,
  observed inclusion, and contact subset. No default ordering — layout is the
  consumer's responsibility.
