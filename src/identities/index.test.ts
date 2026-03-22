import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import * as identities from "./index.ts";

describe("identities barrel", () => {
  it("exports schema init and internal helpers", () => {
    strictEqual(typeof identities.initIdentitiesTables, "function");
    strictEqual(typeof identities.getIdentityRowById, "function");
    strictEqual(typeof identities.normalizeIdentityKey, "function");
    strictEqual(typeof identities.buildIdentityMutationReceipt, "function");
  });
});
