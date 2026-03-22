/** Raw `events` row from SQLite (snake_case columns). */
export interface EventRow {
  id: number;
  type: string;
  occurred_at: number;
  summary: string;
  significance: number;
  moment_kind: string | null;
  recurrence_kind: string | null;
  anchor_month: number | null;
  anchor_day: number | null;
  anchor_contact_id: number | null;
  anchor_link_id: number | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}
