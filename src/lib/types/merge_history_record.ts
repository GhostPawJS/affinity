/** Merge lineage row — CONCEPT.md MergeHistoryRecord. */
export interface MergeHistoryRecord {
  winnerContactId: number;
  loserContactId: number;
  mergedAt: number;
  reasonSummary?: string | null;
  manual: boolean;
}
