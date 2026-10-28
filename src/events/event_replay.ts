import type { AffinityDb } from "../database.ts";
import { refreshAllBridgeScores } from "../graph/bridge_scores.ts";
import { applyEventEffectToLink } from "../links/effects.ts";
import { refreshLinkRollup } from "../links/rollups.ts";
import { loadEventRecord } from "./loaders.ts";

/** Restore the pre-evidence state, then replay surviving evidence in intake order. */
export function replayEventLinks(
  db: AffinityDb,
  linkIds: number[],
  now: number,
): void {
  const eventIds = new Set<number>();
  for (const linkId of linkIds) {
    const saved = db
      .prepare("SELECT state_json FROM event_link_baselines WHERE link_id=?")
      .get(linkId) as { state_json: string } | undefined;
    if (!saved) continue;
    const baseline = JSON.parse(saved.state_json) as {
      rank: number;
      affinity: number;
      trust: number;
      state: string;
      cadence_days: number | null;
    };
    const effects = db
      .prepare(
        "SELECT event_id, participant_json, provenance_json, created_at FROM link_event_effects WHERE link_id=? ORDER BY event_id",
      )
      .all(linkId) as {
      event_id: number;
      participant_json: string | null;
      provenance_json: string | null;
      created_at: number;
    }[];
    const overrides = db
      .prepare(
        "SELECT after_event_id,state FROM event_link_state_changes WHERE link_id=? ORDER BY id",
      )
      .all(linkId) as { after_event_id: number; state: string }[];
    let overrideIndex = 0;
    const applyOverrides = (beforeId: number) => {
      while (
        overrideIndex < overrides.length &&
        (overrides[overrideIndex]?.after_event_id ?? Number.POSITIVE_INFINITY) <
          beforeId
      ) {
        const override = overrides[overrideIndex];
        if (override)
          db.prepare("UPDATE links SET state=? WHERE id=?").run(
            override.state,
            linkId,
          );
        overrideIndex++;
      }
    };
    db.prepare("DELETE FROM link_event_effects WHERE link_id=?").run(linkId);
    db.prepare(
      "UPDATE links SET rank=?,affinity=?,trust=?,state=?,cadence_days=?,updated_at=? WHERE id=?",
    ).run(
      baseline.rank,
      baseline.affinity,
      baseline.trust,
      baseline.state,
      baseline.cadence_days,
      now,
      linkId,
    );
    for (const effect of effects) {
      eventIds.add(effect.event_id);
      applyOverrides(effect.event_id);
      if (
        !db
          .prepare("SELECT id FROM events WHERE id=? AND deleted_at IS NULL")
          .get(effect.event_id)
      )
        continue;
      const event = loadEventRecord(db, effect.event_id);
      const link = db
        .prepare("SELECT from_contact_id,to_contact_id FROM links WHERE id=?")
        .get(linkId) as { from_contact_id: number; to_contact_id: number };
      const participant = effect.participant_json
        ? JSON.parse(effect.participant_json)
        : (event.participants.find((p) => p.contactId === link.to_contact_id) ??
          event.participants[0]);
      const provenance = db
        .prepare("SELECT provenance_json FROM events WHERE id=?")
        .get(event.id) as { provenance_json: string | null };
      applyEventEffectToLink(db, {
        linkId,
        eventId: event.id,
        eventType: event.type,
        occurredAt: event.occurredAt,
        significance: event.significance,
        participant,
        provenance: provenance.provenance_json
          ? JSON.parse(provenance.provenance_json)
          : effect.provenance_json
            ? JSON.parse(effect.provenance_json)
            : undefined,
        now: effect.created_at,
      });
    }
    applyOverrides(Number.POSITIVE_INFINITY);
    refreshLinkRollup(db, linkId, now);
  }
  for (const eventId of eventIds)
    db.prepare(
      "UPDATE events SET moment_kind=COALESCE(declared_moment_kind,(SELECT moment_kind FROM link_event_effects WHERE event_id=events.id AND moment_kind IS NOT NULL ORDER BY link_id LIMIT 1)) WHERE id=?",
    ).run(eventId);
  refreshAllBridgeScores(db, now);
}
