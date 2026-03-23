import { reviewAffinityToolHandler } from "../tools/review_affinity_tool.ts";
import { navigate } from "./app.tsx";
import { useAffinity } from "./context.ts";
import { Badge, EmptyState, Explainer, Panel, SummaryCard } from "./ui.tsx";

export function InsightsPage() {
  const { db, revision } = useAffinity();
  void revision;

  const radarResult = reviewAffinityToolHandler(db, {
    view: "links.radar",
    includeArchived: true,
    limit: 50,
  });
  const chartResult = reviewAffinityToolHandler(db, {
    view: "graph.chart",
    includeObserved: true,
  });
  const duplicatesResult = reviewAffinityToolHandler(db, {
    view: "contacts.duplicates",
    limit: 20,
  });

  const radarItems = radarResult.ok ? radarResult.data.items : [];
  const chartData = chartResult.ok ? chartResult.data.chart : undefined;
  const duplicates = duplicatesResult.ok ? duplicatesResult.data.items : [];

  return (
    <div class="page-grid">
      {/* Radar */}
      <Panel
        title="Radar"
        subtitle="Radar monitors your relationship maintenance health. It flags links that are drifting (overdue for contact), surfaces upcoming dates, and highlights contacts that need attention."
      >
        {radarItems.length === 0 ? (
          <EmptyState message="No radar signals yet. Create social links with a cadence to start seeing drift indicators." />
        ) : (
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Link</th>
                  <th>Detail</th>
                  <th>Kind</th>
                </tr>
              </thead>
              <tbody>
                {radarItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.title ?? `#${item.id}`}</strong>
                    </td>
                    <td>{item.subtitle ?? ""}</td>
                    <td>
                      <Badge label={item.kind} variant="kind" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div class="mt-sm muted-sm">
          <strong>Drift legend:</strong>{" "}
          <span
            class="drift-dot green"
            style={{ display: "inline-block", verticalAlign: "middle" }}
          />{" "}
          On track{" "}
          <span
            class="drift-dot amber"
            style={{ display: "inline-block", verticalAlign: "middle" }}
          />{" "}
          Drifting{" "}
          <span
            class="drift-dot red"
            style={{ display: "inline-block", verticalAlign: "middle" }}
          />{" "}
          Overdue
        </div>
      </Panel>

      {/* Affinity Chart */}
      <Panel
        title="Affinity Chart"
        subtitle="The Affinity Chart is a topology of your entire relationship network. Nodes are contacts; edges are links. Bridge scores identify who connects otherwise-separate clusters."
      >
        {chartData === undefined ? (
          <EmptyState message="No chart data yet. Create contacts and links to build the graph." />
        ) : (
          <div>
            <h3 style={{ fontSize: "0.95rem", margin: "0 0 10px" }}>
              Nodes ({chartData.nodes.length})
            </h3>
            <div class="summary-grid">
              {chartData.nodes.map((node) => (
                <SummaryCard
                  key={node.contactId}
                  label={node.label ?? `#${node.contactId}`}
                  value={node.kind}
                  sublabel={`Contact #${node.contactId}. Bridge score measures how much this contact connects separate clusters.`}
                />
              ))}
            </div>

            <h3 style={{ fontSize: "0.95rem", margin: "16px 0 10px" }}>
              Edges ({chartData.edges.length})
            </h3>
            {chartData.edges.length === 0 ? (
              <EmptyState message="No edges in the chart yet." />
            ) : (
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>From</th>
                      <th>To</th>
                      <th>Weight</th>
                      <th>Bridge Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.edges.map((edge) => (
                      <tr key={edge.linkId}>
                        <td>Contact #{edge.fromContactId}</td>
                        <td>Contact #{edge.toContactId}</td>
                        <td>
                          {typeof edge.weight === "number"
                            ? edge.weight.toFixed(2)
                            : edge.weight}
                        </td>
                        <td>{edge.bridgeScore.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Panel>

      {/* Duplicates */}
      <Panel
        title="Duplicate Detection"
        subtitle="Potential duplicate contacts scored by name similarity and shared identities. Review these pairs and merge confirmed duplicates."
      >
        {duplicates.length === 0 ? (
          <EmptyState message="No duplicate candidates found. Create contacts with similar names to see scoring." />
        ) : (
          <div class="list">
            {duplicates.map((item) => (
              <div
                key={item.id}
                class="list-item"
                style={{ cursor: "default" }}
              >
                <div class="list-item-body">
                  <strong>{item.title ?? `Pair #${item.id}`}</strong>
                  <small>{item.subtitle ?? ""}</small>
                </div>
                <button
                  class="button sm primary"
                  onClick={() => navigate("/contacts")}
                  type="button"
                >
                  Merge &rarr;
                </button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Explainers */}
      <div class="stack">
        <Explainer title="How Radar detects drift">
          Each social link can have an optional cadence (target contact
          frequency in days). Radar compares the time since the last interaction
          against this cadence to compute drift. Links without a cadence are
          monitored using system defaults. The result is a maintenance signal:
          on track, drifting, or overdue.
        </Explainer>
        <Explainer title="Bridge scores explained">
          Bridge score measures how much a contact connects otherwise-separate
          parts of your network (betweenness centrality). A high bridge score
          means removing this contact would disconnect clusters. These are the
          social connectors in your life.
        </Explainer>
        <Explainer title="Duplicate scoring method">
          The system scores pairs by comparing names (edit distance and token
          overlap) and checking for shared identities (same email, phone, etc.).
          Pairs above a confidence threshold appear as duplicate candidates.
          Merging is always explicit and deterministic.
        </Explainer>
      </div>
    </div>
  );
}
