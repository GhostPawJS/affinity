import type { AffinityDb } from "../database.ts";
import { refreshAllBridgeScores } from "../graph/bridge_scores.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import { refreshLinkRollup } from "../links/rollups.ts";
import { withTransaction } from "../with_transaction.ts";
import { refreshContactRollup } from "./rollups.ts";

/** Permanently erase a contact and dependent records. The owner cannot be erased. */
export function deleteContact(
  db: AffinityDb,
  locatorId: number,
  options: { confirm?: boolean },
) {
  if (options?.confirm !== true)
    throw new AffinityValidationError(
      "delete is permanent; pass confirm: true",
    );
  return withTransaction(db, () => {
    const contact = db
      .prepare("SELECT is_owner FROM contacts WHERE id = ?")
      .get(locatorId);
    if (!contact) throw new AffinityNotFoundError("contact not found");
    if (contact.is_owner)
      throw new AffinityStateError("The owner contact cannot be deleted");
    const tables = [
      "contacts",
      "identities",
      "attributes",
      "links",
      "events",
      "event_participants",
      "open_commitments",
      "contact_merges",
      "dismissed_duplicates",
      "link_event_effects",
      "upcoming_occurrences",
      "link_rollups",
      "contact_rollups",
    ];
    const before = new Map(
      tables.map((table) => [
        table,
        db.prepare(`SELECT rowid AS row_id, * FROM ${table}`).all(),
      ]),
    );
    db.prepare(
      "DELETE FROM events WHERE id IN (SELECT p.event_id FROM event_participants p WHERE p.contact_id = ? AND NOT EXISTS (SELECT 1 FROM event_participants q JOIN contacts c ON c.id = q.contact_id WHERE q.event_id = p.event_id AND q.contact_id != ? AND c.is_owner = 0))",
    ).run(locatorId, locatorId);
    db.prepare(
      "DELETE FROM contact_merges WHERE winner_contact_id = ? OR loser_contact_id = ?",
    ).run(locatorId, locatorId);
    db.prepare(
      "DELETE FROM dismissed_duplicates WHERE left_id = ? OR right_id = ?",
    ).run(locatorId, locatorId);
    db.prepare(
      "UPDATE contacts SET merged_into_contact_id = NULL WHERE merged_into_contact_id = ?",
    ).run(locatorId);
    db.prepare("DELETE FROM contacts WHERE id = ?").run(locatorId);
    const now = Date.now();
    const affectedLinks = (
      db
        .prepare(
          "SELECT id FROM links WHERE removed_at IS NULL AND is_structural = 0",
        )
        .all() as { id: number }[]
    ).map((row) => row.id);
    refreshAllBridgeScores(db, now);
    for (const id of affectedLinks) refreshLinkRollup(db, id, now);
    for (const row of db.prepare("SELECT id FROM contacts").all())
      refreshContactRollup(db, Number(row.id), now);
    const removed = tables
      .map((table) => {
        const remaining = new Set(
          db
            .prepare(`SELECT rowid AS row_id FROM ${table}`)
            .all()
            .map((row) => row.row_id),
        );
        const ids = (before.get(table) ?? [])
          .filter((row) => !remaining.has(row.row_id))
          .map((row) => Number(row.id ?? row.event_id ?? row.row_id));
        return { entity: table, count: ids.length, ids };
      })
      .filter((item) => item.count > 0);
    return { contactId: locatorId, removed, affectedLinks };
  });
}
