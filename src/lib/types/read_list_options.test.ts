import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AFFINITY_DEFAULT_LIST_LIMIT,
  AFFINITY_MAX_LIST_LIMIT,
  type AffinityListReadOptions,
} from "./read_list_options.ts";

describe("AffinityListReadOptions", () => {
  it("documents pagination bounds", () => {
    strictEqual(AFFINITY_DEFAULT_LIST_LIMIT, 50);
    strictEqual(AFFINITY_MAX_LIST_LIMIT, 250);
  });

  it("allows fully optional fields", () => {
    const o: AffinityListReadOptions = {};
    strictEqual(o.limit, undefined);
  });
});
