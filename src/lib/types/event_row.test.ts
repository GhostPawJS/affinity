import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { EventRow } from "./event_row.ts";

describe("EventRow", () => {
  it("matches storage columns", () => {
    const row: EventRow = {
      id: 1,
      type: "conversation",
      occurred_at: 0,
      summary: "x",
      significance: 5,
      moment_kind: null,
      recurrence_kind: null,
      anchor_month: null,
      anchor_day: null,
      anchor_contact_id: null,
      anchor_link_id: null,
      created_at: 0,
      updated_at: 0,
      deleted_at: null,
    };
    strictEqual(row.type, "conversation");
  });
});
