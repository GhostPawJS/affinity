import type { ContactKind } from "../contacts/types.ts";
import type { AffinityDb } from "../database.ts";
import { assertDefaultOrdering } from "../lib/read/assert_default_ordering.ts";
import type { AffinityChartEdge } from "../lib/types/affinity_chart_edge.ts";
import type { AffinityChartNode } from "../lib/types/affinity_chart_node.ts";
import type { AffinityChartRecord } from "../lib/types/affinity_chart_record.ts";
import type { AffinityListReadOptions } from "../lib/types/read_list_options.ts";

export function getAffinityChart(
  db: AffinityDb,
  options?: AffinityListReadOptions,
): AffinityChartRecord {
  assertDefaultOrdering("getAffinityChart", options);
  const clauses: string[] = [
    "deleted_at IS NULL",
    "lifecycle_state = 'active'",
  ];
  const contactRows = db
    .prepare(
      `SELECT id, name, kind FROM contacts WHERE ${clauses.join(" AND ")}`,
    )
    .all() as { id: number; name: string; kind: string }[];
  const nodes: AffinityChartNode[] = contactRows.map((c) => ({
    contactId: c.id,
    label: c.name,
    kind: c.kind as ContactKind,
  }));
  const linkClauses: string[] = ["removed_at IS NULL", "is_structural = 0"];
  if (options?.includeArchived !== true) {
    linkClauses.push("state != 'archived'");
  }
  if (options?.includeObserved === false) {
    linkClauses.push("kind != 'observed'");
  }
  const where = linkClauses.join(" AND ");
  const linkRows = db
    .prepare(
      `SELECT
         l.id,
         l.from_contact_id,
         l.to_contact_id,
         l.trust,
         l.rank,
         lr.edge_weight
       FROM links l
       LEFT JOIN link_rollups lr ON lr.link_id = l.id
       WHERE ${where}`,
    )
    .all() as {
    id: number;
    from_contact_id: number;
    to_contact_id: number;
    trust: number | null;
    rank: number | null;
    edge_weight: number | null;
  }[];
  const edges: AffinityChartEdge[] = linkRows.map((l) => {
    return {
      linkId: l.id,
      fromContactId: l.from_contact_id,
      toContactId: l.to_contact_id,
      weight: l.edge_weight ?? 0,
    };
  });
  return { nodes, edges };
}
