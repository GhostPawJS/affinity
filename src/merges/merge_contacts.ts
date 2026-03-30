import { getContactRowById } from "../contacts/queries.ts";
import { buildMergeMutationReceipt } from "../contacts/receipts.ts";
import { refreshContactRollup } from "../contacts/rollups.ts";
import type { AffinityDb } from "../database.ts";
import { refreshAllBridgeScores } from "../graph/bridge_scores.ts";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import { AffinityMergeError } from "../lib/errors/affinity_merge_error.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import type { LinkRow } from "../lib/types/link_row.ts";
import type { MergeContactsInput } from "../lib/types/merge_contacts_input.ts";
import type { MergeReceipt } from "../lib/types/mutation_receipt.ts";
import { refreshLinkRollup } from "../links/rollups.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";

function dedupeLiveLinks(db: AffinityDb, now: number): number[] {
  const removed = new Set<number>();
  const rows = db
    .prepare(
      `SELECT id, from_contact_id, to_contact_id, kind, is_structural, role
       FROM links WHERE removed_at IS NULL`,
    )
    .all() as unknown as LinkRow[];
  const groups = new Map<string, LinkRow[]>();
  for (const r of rows) {
    const key = `${r.from_contact_id}|${r.to_contact_id}|${r.kind}|${r.is_structural}|${r.role ?? ""}`;
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }
  for (const list of groups.values()) {
    if (list.length <= 1) continue;
    list.sort((a, b) => a.id - b.id);
    for (let i = 1; i < list.length; i++) {
      const id = list[i]?.id;
      if (id === undefined) continue;
      db.prepare(
        "UPDATE links SET removed_at = ?, updated_at = ? WHERE id = ?",
      ).run(now, now, id);
      removed.add(id);
    }
  }
  return [...removed];
}

function softDeleteSelfLoops(db: AffinityDb, now: number): number[] {
  const rows = db
    .prepare(
      "SELECT id FROM links WHERE removed_at IS NULL AND from_contact_id = to_contact_id",
    )
    .all() as { id: number }[];
  const ids: number[] = [];
  for (const r of rows) {
    db.prepare(
      "UPDATE links SET removed_at = ?, updated_at = ? WHERE id = ?",
    ).run(now, now, r.id);
    ids.push(r.id);
  }
  return ids;
}

export function mergeContacts(
  db: AffinityDb,
  input: MergeContactsInput,
): MergeReceipt {
  return withTransaction(db, () => {
    const winnerId = input.winnerContactId;
    const loserId = input.loserContactId;
    if (winnerId === loserId) {
      throw new AffinityMergeError("cannot merge contact into itself");
    }
    const winner = getContactRowById(db, winnerId);
    const loser = getContactRowById(db, loserId);
    if (!winner || !loser) {
      throw new AffinityNotFoundError("contact not found");
    }
    if (
      winner.lifecycle_state === "merged" ||
      loser.lifecycle_state === "merged"
    ) {
      throw new AffinityMergeError("cannot merge merged contact");
    }
    if (winner.is_owner === 1 && loser.is_owner === 1) {
      throw new AffinityInvariantError("multiple owner rows");
    }
    const now = resolveNow(input.now);
    const reasonSummary =
      input.reasonSummary === undefined || input.reasonSummary === null
        ? null
        : (() => {
            const t = input.reasonSummary.trim();
            return t.length === 0 ? null : t;
          })();

    if (loser.is_owner === 1 && winner.is_owner === 0) {
      db.prepare(
        "UPDATE contacts SET is_owner = 0, updated_at = ? WHERE id = ?",
      ).run(now, loserId);
      db.prepare(
        "UPDATE contacts SET is_owner = 1, updated_at = ? WHERE id = ?",
      ).run(now, winnerId);
    }

    const loserIdentityRows = db
      .prepare(
        "SELECT id, normalized_key FROM identities WHERE contact_id = ? AND removed_at IS NULL",
      )
      .all(loserId) as { id: number; normalized_key: string }[];
    for (const row of loserIdentityRows) {
      const dup = db
        .prepare(
          `SELECT id FROM identities
           WHERE contact_id = ? AND normalized_key = ? AND removed_at IS NULL`,
        )
        .get(winnerId, row.normalized_key) as { id: number } | undefined;
      if (dup) {
        db.prepare(
          "UPDATE identities SET removed_at = ?, updated_at = ? WHERE id = ?",
        ).run(now, now, row.id);
      } else {
        db.prepare(
          "UPDATE identities SET contact_id = ?, updated_at = ? WHERE id = ?",
        ).run(winnerId, now, row.id);
      }
    }

    const loserAttrRows = db
      .prepare(
        "SELECT id, name FROM attributes WHERE contact_id = ? AND deleted_at IS NULL",
      )
      .all(loserId) as { id: number; name: string }[];
    for (const row of loserAttrRows) {
      const dup = db
        .prepare(
          `SELECT id FROM attributes
           WHERE contact_id = ? AND name = ? AND deleted_at IS NULL`,
        )
        .get(winnerId, row.name) as { id: number } | undefined;
      if (dup) {
        db.prepare(
          "UPDATE attributes SET deleted_at = ?, updated_at = ? WHERE id = ?",
        ).run(now, now, row.id);
      } else {
        db.prepare(
          "UPDATE attributes SET contact_id = ?, updated_at = ? WHERE id = ?",
        ).run(winnerId, now, row.id);
      }
    }

    db.prepare(
      `DELETE FROM event_participants WHERE id IN (
         SELECT ep_loser.id
         FROM event_participants ep_winner
         INNER JOIN event_participants ep_loser
           ON ep_winner.event_id = ep_loser.event_id
          AND ep_winner.contact_id = ?
          AND ep_loser.contact_id = ?
       )`,
    ).run(winnerId, loserId);

    db.prepare(
      "UPDATE event_participants SET contact_id = ? WHERE contact_id = ?",
    ).run(winnerId, loserId);

    db.prepare(
      `UPDATE events SET anchor_contact_id = ?, updated_at = ?
       WHERE anchor_contact_id = ? AND deleted_at IS NULL`,
    ).run(winnerId, now, loserId);

    db.prepare(
      `UPDATE links SET from_contact_id = ?, updated_at = ?
       WHERE from_contact_id = ? AND removed_at IS NULL`,
    ).run(winnerId, now, loserId);

    db.prepare(
      `UPDATE links SET to_contact_id = ?, updated_at = ?
       WHERE to_contact_id = ? AND removed_at IS NULL`,
    ).run(winnerId, now, loserId);

    const affectedLinks = new Set<number>();
    for (const id of softDeleteSelfLoops(db, now)) {
      affectedLinks.add(id);
    }
    for (const id of dedupeLiveLinks(db, now)) {
      affectedLinks.add(id);
    }

    db.prepare(
      `UPDATE contacts SET
         lifecycle_state = 'merged',
         merged_into_contact_id = ?,
         updated_at = ?
       WHERE id = ?`,
    ).run(winnerId, now, loserId);

    db.prepare(
      `INSERT INTO contact_merges (winner_contact_id, loser_contact_id, merged_at, reason_summary, manual)
       VALUES (?, ?, ?, ?, 1)`,
    ).run(winnerId, loserId, now, reasonSummary);

    db.prepare(
      "DELETE FROM dismissed_duplicates WHERE left_id = ? OR right_id = ?",
    ).run(loserId, loserId);
    db.prepare(
      "DELETE FROM dismissed_duplicates WHERE left_id = ? OR right_id = ?",
    ).run(winnerId, winnerId);

    db.prepare(
      "DELETE FROM link_rollups WHERE link_id IN (SELECT id FROM links WHERE removed_at IS NOT NULL)",
    ).run();
    const liveWinnerLinks = db
      .prepare(
        `SELECT id FROM links
         WHERE removed_at IS NULL
           AND (from_contact_id = ? OR to_contact_id = ?)`,
      )
      .all(winnerId, winnerId) as { id: number }[];
    for (const row of liveWinnerLinks) {
      refreshLinkRollup(db, row.id, now);
    }
    refreshContactRollup(db, winnerId, now);
    refreshContactRollup(db, loserId, now);
    refreshAllBridgeScores(db, now);

    return buildMergeMutationReceipt(
      { winnerContactId: winnerId, loserContactId: loserId },
      {
        updated: [
          { kind: "contact", id: winnerId },
          { kind: "contact", id: loserId },
        ],
        affectedLinks: [...affectedLinks],
      },
    );
  });
}
