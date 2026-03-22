import { throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import { assertValidLifecycleTransition } from "./validators.ts";

describe("contacts validators", () => {
  it("allows documented transitions", () => {
    assertValidLifecycleTransition("active", "dormant");
    assertValidLifecycleTransition("dormant", "active");
    assertValidLifecycleTransition("active", "lost");
    assertValidLifecycleTransition("lost", "active");
  });

  it("no-ops same state", () => {
    assertValidLifecycleTransition("active", "active");
  });

  it("rejects merged row changes", () => {
    throws(
      () => assertValidLifecycleTransition("merged", "active"),
      (error: unknown) => error instanceof AffinityStateError,
    );
  });

  it("reaches merged only via mergeContacts", () => {
    throws(
      () => assertValidLifecycleTransition("active", "merged"),
      (error: unknown) => error instanceof AffinityInvariantError,
    );
  });

  it("rejects illegal jumps", () => {
    throws(
      () => assertValidLifecycleTransition("lost", "dormant"),
      (error: unknown) => error instanceof AffinityValidationError,
    );
  });
});
