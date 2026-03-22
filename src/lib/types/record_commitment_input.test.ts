import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { RecordCommitmentInput } from "./record_commitment_input.ts";

describe("RecordCommitmentInput", () => {
  it("accepts commitment fields", () => {
    const input: RecordCommitmentInput = {
      commitmentType: "promise",
      occurredAt: 1,
      summary: "pay back",
      significance: 5,
      participants: [{ contactId: 1, role: "actor" }],
      dueAt: 99,
    };
    strictEqual(input.commitmentType, "promise");
  });
});
