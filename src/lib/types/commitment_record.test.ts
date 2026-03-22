import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { CommitmentRecord } from "./commitment_record.ts";

describe("CommitmentRecord", () => {
  it("allows unresolved commitments", () => {
    const c: CommitmentRecord = {
      eventId: 1,
      type: "promise",
      summary: "follow up",
      participants: [],
      resolutionState: "open",
    };
    strictEqual(c.resolutionState, "open");
  });
});
