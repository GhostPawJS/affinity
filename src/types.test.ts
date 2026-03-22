import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { ContactKind, EntityRef } from "./types.ts";
import * as Types from "./types.ts";

describe("types barrel", () => {
  it("re-exports domain enums and shared contracts", () => {
    const k: ContactKind = "human";
    const ref: EntityRef = { kind: "event", id: 1 };
    strictEqual(k, "human");
    strictEqual(ref.kind, "event");
  });

  it("exposes list limit constants and resolver", () => {
    strictEqual(Types.AFFINITY_DEFAULT_LIST_LIMIT, 50);
    strictEqual(Types.AFFINITY_MAX_LIST_LIMIT, 250);
    strictEqual(Types.resolveAffinityListLimit(undefined), 50);
  });
});
