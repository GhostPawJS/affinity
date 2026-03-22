/** Dedupe candidate pair — CONCEPT.md DuplicateCandidateRecord. */
export interface DuplicateCandidateRecord {
  leftContactId: number;
  rightContactId: number;
  matchReason: string;
  matchScore: number;
}
