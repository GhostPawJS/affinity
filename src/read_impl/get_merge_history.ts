import type { AffinityDb } from "../database.ts";
import type { MergeHistoryRecord } from "../lib/types/merge_history_record.ts";

export function getMergeHistory(
  db: AffinityDb,
  contactId: number,
): MergeHistoryRecord[] {
  const rows = db
    .prepare(
      `SELECT winner_contact_id, loser_contact_id, merged_at, reason_summary, manual
       FROM contact_merges
       WHERE winner_contact_id = ? OR loser_contact_id = ?
       ORDER BY merged_at DESC`,
    )
    .all(contactId, contactId) as {
    winner_contact_id: number;
    loser_contact_id: number;
    merged_at: number;
    reason_summary: string | null;
    manual: number;
  }[];
  return rows.map((r) => ({
    winnerContactId: r.winner_contact_id,
    loserContactId: r.loser_contact_id,
    mergedAt: r.merged_at,
    reasonSummary: r.reason_summary,
    manual: r.manual === 1,
  }));
}
