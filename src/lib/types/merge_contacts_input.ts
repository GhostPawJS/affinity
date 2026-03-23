/** Arguments for `write.mergeContacts` — CONCEPT.md. */
export interface MergeContactsInput {
  winnerContactId: number;
  loserContactId: number;
  reasonSummary?: string | null;
  now?: number;
}
