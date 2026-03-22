import type { ContactKind } from "../contacts/types.ts";
import type { AffinityDb } from "../database.ts";
import type { AffinityChartEdge } from "../lib/types/affinity_chart_edge.ts";
import type { AffinityChartNode } from "../lib/types/affinity_chart_node.ts";
import type { AffinityChartRecord } from "../lib/types/affinity_chart_record.ts";
import type { LinkRow } from "../lib/types/link_row.ts";
import type { AffinityListReadOptions } from "../lib/types/read_list_options.ts";

export function getAffinityChart(
  db: AffinityDb,
  options?: AffinityListReadOptions,
): AffinityChartRecord {
  const clauses: string[] = [
    "deleted_at IS NULL",
    "lifecycle_state IN ('active', 'dormant')",
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
  const linkClauses: string[] = [
    "removed_at IS NULL",
    "is_structural = 0",
    "state != 'archived'",
  ];
  if (options?.includeObserved === false) {
    linkClauses.push("kind != 'observed'");
  }
  const where = linkClauses.join(" AND ");
  const linkRows = db
    .prepare(
      `SELECT id, from_contact_id, to_contact_id, kind, role, is_structural,
              rank, affinity, trust, state, cadence_days, bond,
              created_at, updated_at, removed_at
       FROM links
       WHERE ${where}`,
    )
    .all() as unknown as LinkRow[];
  const edges: AffinityChartEdge[] = linkRows.map((l) => {
    const trust = l.trust ?? 0;
    const rank = l.rank ?? 0;
    const normalizedRank = Math.min(1, rank / 10);
    const weight = trust * (0.6 + 0.4 * normalizedRank);
    return {
      linkId: l.id,
      fromContactId: l.from_contact_id,
      toContactId: l.to_contact_id,
      weight,
    };
  });
  return { nodes, edges };
}
