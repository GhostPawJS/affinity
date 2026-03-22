/** Raw `contacts` row from SQLite (snake_case columns). */
export interface ContactRow {
  id: number;
  name: string;
  kind: string;
  lifecycle_state: string;
  is_owner: number;
  merged_into_contact_id: number | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}
