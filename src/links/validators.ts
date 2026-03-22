import { getContactRowById } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import type { LinkRow } from "../lib/types/link_row.ts";
import type { LinkState } from "./types.ts";

const STATES = new Set<string>([
  "active",
  "dormant",
  "strained",
  "broken",
  "archived",
]);

export function assertContactEndpointsNotMerged(
  db: AffinityDb,
  fromContactId: number,
  toContactId: number,
): void {
  const from = getContactRowById(db, fromContactId);
  const to = getContactRowById(db, toContactId);
  if (!from || !to) {
    throw new AffinityNotFoundError("contact not found");
  }
  if (from.lifecycle_state === "merged" || to.lifecycle_state === "merged") {
    throw new AffinityStateError("merged contact is read-only");
  }
}

export function assertLinkEndpointsNotMerged(
  db: AffinityDb,
  row: LinkRow,
): void {
  assertContactEndpointsNotMerged(db, row.from_contact_id, row.to_contact_id);
}

export function assertValidLinkState(
  state: string,
): asserts state is LinkState {
  if (!STATES.has(state)) {
    throw new AffinityValidationError("invalid link state");
  }
}

export function validateRelationalMechanics(
  rank: number,
  affinity: number,
  trust: number,
  state: string,
): asserts state is LinkState {
  if (!Number.isInteger(rank) || rank < 0) {
    throw new AffinityValidationError("rank must be a non-negative integer");
  }
  if (!Number.isFinite(affinity) || affinity < 0 || affinity >= 1) {
    throw new AffinityValidationError(
      "affinity must be finite and in the range [0, 1)",
    );
  }
  if (!Number.isFinite(trust) || trust < 0 || trust > 1) {
    throw new AffinityValidationError(
      "trust must be finite and in the range [0, 1]",
    );
  }
  assertValidLinkState(state);
}
