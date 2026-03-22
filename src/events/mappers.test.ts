import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { EventRow } from "../lib/types/event_row.ts";
import {
  mapEventRowToEventRecord,
  mapUpcomingRowToUpcomingDateRecord,
} from "./mappers.ts";

describe("events mappers", () => {
  it("maps event rows to event records", () => {
    const row: EventRow = {
      id: 1,
      type: "date_anchor",
      occurred_at: 1,
      summary: "Birthday",
      significance: 5,
      moment_kind: null,
      recurrence_kind: "birthday",
      anchor_month: 3,
      anchor_day: 15,
      anchor_contact_id: 2,
      anchor_link_id: null,
      created_at: 1,
      updated_at: 1,
      deleted_at: null,
    };
    const record = mapEventRowToEventRecord(row, []);
    strictEqual(record.anchorContactId, 2);
    strictEqual(record.recurrenceKind, "birthday");
  });

  it("maps upcoming occurrence rows to upcoming date records", () => {
    const record = mapUpcomingRowToUpcomingDateRecord({
      id: 1,
      recurrence_kind: "anniversary",
      summary: "Day",
      significance: 8,
      anchor_contact_id: null,
      anchor_link_id: 3,
      occurs_on: 10,
    });
    strictEqual(record.targetRef.kind, "link");
    strictEqual(record.recurrenceKind, "anniversary");
  });
});
