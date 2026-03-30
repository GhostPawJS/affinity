/** A persisted dismissal row returned by listDismissedDuplicates. */
export interface DismissedDuplicateRecord {
  leftContactId: number;
  rightContactId: number;
  reason: string | null;
  dismissedAt: number;
}
