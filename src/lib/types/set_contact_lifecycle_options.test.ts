import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { SetContactLifecycleOptions } from "./set_contact_lifecycle_options.ts";

describe("SetContactLifecycleOptions", () => {
  it("allows provenance passthrough", () => {
    const o: SetContactLifecycleOptions = { provenance: { source: "manual" } };
    strictEqual((o.provenance as { source: string }).source, "manual");
  });
});
