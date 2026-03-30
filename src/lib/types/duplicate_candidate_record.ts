/** Dedupe candidate pair — CONCEPT.md DuplicateCandidateRecord. */
export interface DuplicateCandidateRecord {
  leftContactId: number;
  rightContactId: number;
  matchReason: string;
  matchScore: number;
  /** Present and true when the pair has been dismissed and includeDismissed was set. */
  dismissed?: true;
}
