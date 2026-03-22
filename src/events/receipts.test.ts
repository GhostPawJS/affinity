import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { EventRecord } from "../lib/types/event_record.ts";
import { buildEventMutationReceipt } from "./receipts.ts";

describe("events receipts", () => {
  it("defaults mechanical fields", () => {
    const primary: EventRecord = {
      id: 1,
      type: "conversation",
      occurredAt: 0,
      summary: "x",
      significance: 5,
      momentKind: null,
      participants: [],
    };
    const receipt = buildEventMutationReceipt(primary);
    strictEqual(receipt.affectedLinks.length, 0);
  });
});
