import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { LinkDetailRecord } from "./link_detail_record.ts";

describe("LinkDetailRecord", () => {
  it("embeds list link row and counterparty", () => {
    const d: LinkDetailRecord = {
      link: {
        id: 1,
        fromContactId: 1,
        toContactId: 2,
        kind: "personal",
        rank: 0,
        affinity: 0,
        trust: 0.1,
        state: "active",
      },
      counterparty: {
        id: 2,
        name: "Bob",
        kind: "human",
        lifecycleState: "active",
        isOwner: false,
      },
      recentEvents: [],
      moments: [],
    };
    strictEqual(d.derivation, undefined);
  });
});
