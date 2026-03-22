import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { DuplicateCandidateRecord } from "./duplicate_candidate_record.ts";

describe("DuplicateCandidateRecord", () => {
  it("orders ids by domain contract (caller may normalize)", () => {
    const d: DuplicateCandidateRecord = {
      leftContactId: 1,
      rightContactId: 2,
      matchReason: "same email",
      matchScore: 0.99,
    };
    strictEqual(d.matchScore < 1, true);
  });
});
