import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { LinkMutationOptions } from "./link_mutation_options.ts";

describe("LinkMutationOptions", () => {
  it("accepts provenance", () => {
    const o: LinkMutationOptions = { provenance: { src: "import" } };
    strictEqual((o.provenance as { src: string }).src, "import");
  });
});
