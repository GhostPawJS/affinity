import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { EventParticipantView } from "./event_participant_view.ts";

describe("EventParticipantView", () => {
  it("allows optional directionality", () => {
    const p: EventParticipantView = {
      contactId: 1,
      role: "actor",
      directionality: "mutual",
    };
    strictEqual(p.role, "actor");
  });
});
