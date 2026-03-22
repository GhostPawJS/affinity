import { strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { AffinityValidationError } from "../errors/affinity_validation_error.ts";
import {
  AFFINITY_DEFAULT_LIST_LIMIT,
  AFFINITY_MAX_LIST_LIMIT,
} from "./read_list_options.ts";
import { resolveAffinityListLimit } from "./resolve_affinity_list_limit.ts";

describe("resolveAffinityListLimit", () => {
  it("defaults to 50", () => {
    strictEqual(
      resolveAffinityListLimit(undefined),
      AFFINITY_DEFAULT_LIST_LIMIT,
    );
  });

  it("accepts inner bounds", () => {
    strictEqual(resolveAffinityListLimit(1), 1);
    strictEqual(
      resolveAffinityListLimit(AFFINITY_MAX_LIST_LIMIT),
      AFFINITY_MAX_LIST_LIMIT,
    );
  });

  it("rejects non-integers and non-positive values", () => {
    throws(
      () => resolveAffinityListLimit(0),
      (e: unknown) => e instanceof AffinityValidationError,
    );
    throws(
      () => resolveAffinityListLimit(1.2),
      (e: unknown) => e instanceof AffinityValidationError,
    );
  });

  it("rejects limits above the CONCEPT cap", () => {
    throws(
      () => resolveAffinityListLimit(AFFINITY_MAX_LIST_LIMIT + 1),
      (e: unknown) => e instanceof AffinityValidationError,
    );
  });
});
