import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import * as read from "../read.ts";
import * as write from "../write.ts";
import { affinityToolMappings } from "./tool_mapping.ts";

describe("tool_mapping", () => {
  it("covers every public read and write export exactly once", () => {
    const sourceNames = affinityToolMappings.map((mapping) => mapping.source);
    const uniqueNames = new Set(sourceNames);
    strictEqual(uniqueNames.size, sourceNames.length);

    const exportedNames = [
      ...Object.keys(read).sort(),
      ...Object.keys(write).sort(),
    ].sort();
    deepStrictEqual([...uniqueNames].sort(), exportedNames);
  });

  it("keeps the total direct-surface reconciliation at 46 operations", () => {
    strictEqual(affinityToolMappings.length, 46);
  });
});
