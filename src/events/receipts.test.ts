import { deepStrictEqual, strictEqual } from "node:assert/strict";
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

  it("dedupes refs and infers affected links from derived effects", () => {
    const primary: EventRecord = {
      id: 1,
      type: "conversation",
      occurredAt: 0,
      summary: "x",
      significance: 5,
      momentKind: null,
      participants: [],
    };
    const receipt = buildEventMutationReceipt(primary, {
      created: [
        { kind: "event", id: 2 },
        { kind: "event", id: 2 },
        { kind: "link", id: 9 },
      ],
      affectedLinks: [4, 4],
      derivedEffects: [
        {
          linkId: 9,
          eventId: 2,
          baseWeight: 1,
          intensity: 0.5,
          valence: 0.3,
          intimacyDepth: 0.4,
          reciprocitySignal: 1,
          directness: 1,
          preferenceMatch: 1,
          novelty: 1,
          affinityDelta: 0.1,
          trustDelta: 0.1,
          rankBefore: 0,
          rankAfter: 1,
          stateBefore: "active",
          stateAfter: "active",
          cadenceBefore: 10,
          cadenceAfter: 10,
          momentKind: "breakthrough",
        },
        {
          linkId: 9,
          eventId: 2,
          baseWeight: 1,
          intensity: 0.5,
          valence: 0.3,
          intimacyDepth: 0.4,
          reciprocitySignal: 1,
          directness: 1,
          preferenceMatch: 1,
          novelty: 1,
          affinityDelta: 0.1,
          trustDelta: 0.1,
          rankBefore: 0,
          rankAfter: 1,
          stateBefore: "active",
          stateAfter: "active",
          cadenceBefore: 10,
          cadenceAfter: 10,
          momentKind: "breakthrough",
        },
      ],
    });
    deepStrictEqual(receipt.created, [
      { kind: "event", id: 2 },
      { kind: "link", id: 9 },
    ]);
    deepStrictEqual(receipt.affectedLinks, [4, 9]);
    strictEqual(receipt.derivedEffects.length, 1);
  });
});
