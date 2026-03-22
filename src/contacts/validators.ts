import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import type { ContactLifecycleState } from "./types.ts";

/**
 * Enforces CONCEPT lifecycle rules for `setContactLifecycle` (merged terminal, no direct merge).
 */
export function assertValidLifecycleTransition(
  from: ContactLifecycleState,
  to: ContactLifecycleState,
): void {
  if (from === "merged") {
    throw new AffinityStateError("merged contact is read-only");
  }
  if (to === "merged") {
    throw new AffinityInvariantError("use mergeContacts to reach merged state");
  }
  if (from === to) {
    return;
  }
  const allowed: Record<ContactLifecycleState, ContactLifecycleState[]> = {
    active: ["dormant", "lost"],
    dormant: ["active", "lost"],
    lost: ["active"],
    merged: [],
  };
  if (!allowed[from].includes(to)) {
    throw new AffinityValidationError(
      `cannot transition from ${from} to ${to}`,
    );
  }
}
