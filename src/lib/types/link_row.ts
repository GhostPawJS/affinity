/** Raw `links` row from SQLite (snake_case columns). */
export interface LinkRow {
  id: number;
  from_contact_id: number;
  to_contact_id: number;
  kind: string;
  role: string | null;
  is_structural: number;
  rank: number | null;
  affinity: number | null;
  trust: number | null;
  state: string | null;
  cadence_days: number | null;
  bond: string | null;
  created_at: number;
  updated_at: number;
  removed_at: number | null;
}
