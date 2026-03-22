/** Maintenance radar row — CONCEPT.md RadarRecord. */
export interface RadarRecord {
  linkId: number;
  contactId: number;
  driftPriority: number;
  recencyScore: number;
  normalizedRank: number;
  trust: number;
  recommendedReason: string;
}
