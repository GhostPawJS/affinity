import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { MergeHistoryRecord } from "./merge_history_record.ts";

describe("MergeHistoryRecord", () => {
  it("captures deterministic merge outcomes", () => {
    const m: MergeHistoryRecord = {
      winnerContactId: 1,
      loserContactId: 2,
      mergedAt: 99,
      manual: true,
    };
    strictEqual(m.manual, true);
  });
});
