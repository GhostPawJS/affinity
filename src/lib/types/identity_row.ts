/** Raw `identities` row from SQLite. */
export interface IdentityRow {
  id: number;
  contact_id: number;
  type: string;
  value: string;
  label: string | null;
  normalized_key: string;
  verified: number;
  verified_at: number | null;
  created_at: number;
  updated_at: number;
  removed_at: number | null;
}
