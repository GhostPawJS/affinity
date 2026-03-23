import type { ContactKind } from "../contacts/types.ts";
import type { AffinityDb } from "../database.ts";
import type { AffinityChartEdge } from "../lib/types/affinity_chart_edge.ts";
import type { AffinityChartNode } from "../lib/types/affinity_chart_node.ts";
import type { AffinityChartReadOptions } from "../lib/types/affinity_chart_read_options.ts";
import type { AffinityChartRecord } from "../lib/types/affinity_chart_record.ts";

export function getAffinityChart(
  db: AffinityDb,
  options?: AffinityChartReadOptions,
): AffinityChartRecord {
  const contactClauses: string[] = [
    "deleted_at IS NULL",
    "lifecycle_state IN ('active', 'dormant')",
  ];
  const contactParams: (string | number)[] = [];
  if (options?.contactIds !== undefined && options.contactIds.length > 0) {
    const ph = options.contactIds.map(() => "?").join(", ");
    contactClauses.push(`id IN (${ph})`);
    contactParams.push(...options.contactIds);
  }
  const contactRows = db
    .prepare(
      `SELECT id, name, kind FROM contacts WHERE ${contactClauses.join(" AND ")}`,
    )
    .all(...contactParams) as { id: number; name: string; kind: string }[];
  const nodeIds = new Set(contactRows.map((c) => c.id));
  const nodes: AffinityChartNode[] = contactRows.map((c) => ({
    contactId: c.id,
    label: c.name,
    kind: c.kind as ContactKind,
  }));

  const linkClauses: string[] = [
    "l.removed_at IS NULL",
    "l.is_structural = 0",
    "cf.deleted_at IS NULL",
    "cf.lifecycle_state NOT IN ('merged', 'lost')",
    "ct.deleted_at IS NULL",
    "ct.lifecycle_state NOT IN ('merged', 'lost')",
  ];
  const linkParams: (string | number)[] = [];
  if (options?.includeArchived !== true) {
    linkClauses.push("l.state != 'archived'");
  }
  if (options?.includeObserved === false) {
    linkClauses.push("l.kind != 'observed'");
  }
  if (options?.contactIds !== undefined && options.contactIds.length > 0) {
    const ph = options.contactIds.map(() => "?").join(", ");
    linkClauses.push(`l.from_contact_id IN (${ph})`);
    linkParams.push(...options.contactIds);
    linkClauses.push(`l.to_contact_id IN (${ph})`);
    linkParams.push(...options.contactIds);
  }
  const where = linkClauses.join(" AND ");
  const linkRows = db
    .prepare(
      `SELECT
         l.id,
         l.from_contact_id,
         l.to_contact_id,
         lr.edge_weight,
         lr.bridge_score
       FROM links l
       INNER JOIN contacts cf ON cf.id = l.from_contact_id
       INNER JOIN contacts ct ON ct.id = l.to_contact_id
       LEFT JOIN link_rollups lr ON lr.link_id = l.id
       WHERE ${where}`,
    )
    .all(...linkParams) as {
    id: number;
    from_contact_id: number;
    to_contact_id: number;
    edge_weight: number | null;
    bridge_score: number | null;
  }[];
  const edges: AffinityChartEdge[] = [];
  for (const l of linkRows) {
    if (nodeIds.has(l.from_contact_id) && nodeIds.has(l.to_contact_id)) {
      edges.push({
        linkId: l.id,
        fromContactId: l.from_contact_id,
        toContactId: l.to_contact_id,
        weight: l.edge_weight ?? 0,
        bridgeScore: l.bridge_score ?? 0.1,
      });
    }
  }
  return { nodes, edges };
}
