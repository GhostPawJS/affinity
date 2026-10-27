/** Maintenance radar row — CONCEPT.md RadarRecord. */
export interface RadarRecord {
  reasons?: string[];
  linkId: number;
  contactId: number;
  driftPriority: number;
  recencyScore: number;
  normalizedRank: number;
  trust: number;
  recommendedReason: string;
}
