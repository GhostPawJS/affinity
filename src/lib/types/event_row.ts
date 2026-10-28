/** Raw `events` row from SQLite (snake_case columns). */
export interface EventRow {
  content?: string | null;
  external_source?: string | null;
  external_id?: string | null;
  channel?: string | null;
  parent_source?: string | null;
  parent_ref_id?: string | null;
  parent_event_id?: number | null;
  thread_source?: string | null;
  thread_id?: string | null;
  provenance_json?: string | null;
  id: number;
  type: string;
  occurred_at: number;
  occurred_on?: string | null;
  due_at?: number | null;
  due_on?: string | null;
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
