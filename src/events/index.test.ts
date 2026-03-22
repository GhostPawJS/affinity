import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import * as events from "./index.ts";

describe("events barrel", () => {
  it("exports schema inits and internal helpers", () => {
    strictEqual(typeof events.initEventsTables, "function");
    strictEqual(typeof events.initOpenCommitmentsTables, "function");
    strictEqual(typeof events.initEventParticipantsTables, "function");
    strictEqual(typeof events.initUpcomingOccurrencesTables, "function");
    strictEqual(typeof events.getEventRowById, "function");
    strictEqual(typeof events.loadEventRecord, "function");
    strictEqual(typeof events.buildEventMutationReceipt, "function");
  });
});
