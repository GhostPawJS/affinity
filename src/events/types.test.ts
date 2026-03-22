import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  EventMomentKind,
  EventParticipantRole,
  EventRecurrenceKind,
  EventType,
} from "./types.ts";

describe("events types", () => {
  it("narrows EventType", () => {
    const t: EventType = "conversation";
    strictEqual(t, "conversation");
  });

  it("narrows EventMomentKind", () => {
    const m: EventMomentKind = "breakthrough";
    strictEqual(m, "breakthrough");
  });

  it("narrows EventRecurrenceKind", () => {
    const r: EventRecurrenceKind = "birthday";
    strictEqual(r, "birthday");
  });

  it("narrows EventParticipantRole", () => {
    const p: EventParticipantRole = "actor";
    strictEqual(p, "actor");
  });
});
