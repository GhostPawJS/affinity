import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { UpcomingDateRecord } from "./upcoming_date_record.ts";

describe("UpcomingDateRecord", () => {
  it("anchors on contact targets", () => {
    const u: UpcomingDateRecord = {
      anchorEventId: 1,
      targetRef: { kind: "contact", id: 2 },
      recurrenceKind: "birthday",
      occursOn: 0,
      summary: "Birthday",
      significance: 5,
    };
    strictEqual(u.targetRef.kind, "contact");
  });
});
