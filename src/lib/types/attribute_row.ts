/** `attributes` table row — snake_case storage. */
export interface AttributeRow {
  id: number;
  contact_id: number | null;
  link_id: number | null;
  name: string;
  value: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}
