import type { AffinityDb } from "../database.ts";
import type { ToolListItem } from "./tool_types.ts";

/** Add human context while retaining ids and numeric projections for callers. */
export function enrichReviewItem(
  db: AffinityDb,
  item: ToolListItem,
): ToolListItem {
  const name = (id: unknown): string => {
    if (typeof id !== "number") return "";
    return (
      (
        db.prepare("SELECT name FROM contacts WHERE id = ?").get(id) as
          | { name: string }
          | undefined
      )?.name ?? `Contact #${id}`
    );
  };
  const result = { ...item };
  if (item.kind === "link") {
    const link = db
      .prepare(`SELECT l.*, a.name AS from_name, b.name AS to_name, a.is_owner AS from_owner, b.is_owner AS to_owner,
      lr.recency_score, lr.drift_priority, lr.readiness_score, lr.normalized_rank, lr.reciprocity_score, lr.radar_score FROM links l JOIN contacts a ON a.id = l.from_contact_id JOIN contacts b ON b.id = l.to_contact_id LEFT JOIN link_rollups lr ON lr.link_id = l.id WHERE l.id = ?`)
      .get(item.id) as Record<string, unknown> | undefined;
    if (link) {
      result.title = link.from_owner
        ? String(link.to_name)
        : link.to_owner
          ? String(link.from_name)
          : `${link.from_name} · ${link.to_name}`;
      result.subtitle = [link.kind, link.role].filter(Boolean).join(" · ");
      for (const key of ["affinity", "trust", "rank"])
        if (typeof link[key] === "number") result[key] = link[key];
      result.recencyScore ??= link.recency_score;
      result.driftPriority ??= link.drift_priority;
      result.readinessScore = link.readiness_score;
      result.normalizedRank ??= link.normalized_rank;
      result.reciprocityScore = link.reciprocity_score;
      result.radarScore = link.radar_score;
    }
  }
  if (
    item.kind === "event" &&
    typeof item.linkId === "number" &&
    !Array.isArray(item.participants)
  ) {
    const link = db
      .prepare("SELECT from_contact_id, to_contact_id FROM links WHERE id = ?")
      .get(item.linkId) as
      | { from_contact_id: number; to_contact_id: number }
      | undefined;
    if (link)
      result.subtitle = `${item.subtitle} · ${name(link.from_contact_id)} · ${name(link.to_contact_id)}`;
  }
  if (Array.isArray(item.participants)) {
    result.participants = item.participants.map(
      (p: { contactId: number; role: string }) => ({
        id: p.contactId,
        name: name(p.contactId),
        role: p.role,
      }),
    );
    for (const key of ["title", "subtitle", "snippet", "state", "eventId"])
      result[key] = undefined;
  }
  if (result.momentKind === null) result.momentKind = undefined;
  if (result.eventId === result.id) result.eventId = undefined;
  if (result.linkId === result.id) result.linkId = undefined;
  if (result.title === result.summary) result.title = undefined;
  if (item.kind === "link" && item.occursAt !== undefined) {
    for (const key of [
      "affinity",
      "trust",
      "rank",
      "recencyScore",
      "driftPriority",
      "readinessScore",
      "normalizedRank",
      "reciprocityScore",
      "radarScore",
      "subtitle",
      "snippet",
      "targetRef",
      "occursOnDate",
    ])
      result[key] = undefined;
  } else if (item.kind === "link") {
    result.recommendedReason = undefined;
    result.snippet = undefined;
  }
  if (typeof item.leftContactId === "number")
    result.title = `${name(item.leftContactId)} · ${name(item.rightContactId)}`;
  if (typeof item.winnerContactId === "number")
    result.title = `Merged ${name(item.loserContactId)} into ${name(item.winnerContactId)}`;
  if (item.occursAt !== undefined && item.kind === "contact")
    result.title = `${name(item.id)} · ${item.title}`;
  for (const [key, value] of Object.entries(result)) {
    if (
      typeof value === "number" &&
      /score|priority|affinity|trust|rank/i.test(key)
    )
      result[key] = Math.round(value * 1000) / 1000;
  }
  return result;
}
