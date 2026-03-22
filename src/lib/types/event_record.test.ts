import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { EventRecord } from "./event_record.ts";

describe("EventRecord", () => {
  it("carries nullable momentKind for ordinary events", () => {
    const e: EventRecord = {
      id: 1,
      type: "conversation",
      occurredAt: 1,
      summary: "hello",
      significance: 3,
      momentKind: null,
      participants: [],
    };
    strictEqual(e.momentKind, null);
  });
});
