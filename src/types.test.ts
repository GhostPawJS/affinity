import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  ContactKind,
  EntityRef,
  LinkDetailReadOptions,
  LinkListReadFilters,
  ListMomentsFilters,
} from "./types.ts";
import * as Types from "./types.ts";

describe("types barrel", () => {
  it("re-exports domain enums and shared contracts", () => {
    const k: ContactKind = "human";
    const ref: EntityRef = { kind: "event", id: 1 };
    const linkFilters: LinkListReadFilters = { kind: "personal" };
    const detailOptions: LinkDetailReadOptions = { recentEventsLimit: 3 };
    const momentFilters: ListMomentsFilters = { momentKind: "milestone" };
    strictEqual(k, "human");
    strictEqual(ref.kind, "event");
    strictEqual(linkFilters.kind, "personal");
    strictEqual(detailOptions.recentEventsLimit, 3);
    strictEqual(momentFilters.momentKind, "milestone");
  });

  it("exposes list limit constants and resolver", () => {
    strictEqual(Types.AFFINITY_DEFAULT_LIST_LIMIT, 50);
    strictEqual(Types.AFFINITY_MAX_LIST_LIMIT, 250);
    strictEqual(Types.resolveAffinityListLimit(undefined), 50);
  });
});
