import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import * as links from "./index.ts";

describe("links barrel", () => {
  it("exports schema init and internal helpers", () => {
    strictEqual(typeof links.initLinksTables, "function");
    strictEqual(typeof links.initLinkRollupsTables, "function");
    strictEqual(typeof links.initLinkEventEffectsTables, "function");
    strictEqual(typeof links.normalizedRank, "function");
    strictEqual(typeof links.getLinkRowById, "function");
    strictEqual(typeof links.mapLinkRowToLinkListItem, "function");
    strictEqual(typeof links.buildLinkMutationReceipt, "function");
  });
});
