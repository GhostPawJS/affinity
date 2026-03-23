import type { AffinityDb } from "../database.ts";
import { AffinityConflictError } from "../lib/errors/affinity_conflict_error.ts";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import type { LinkMutationReceipt } from "../lib/types/mutation_receipt.ts";
import type { SeedSocialLinkInput } from "../lib/types/seed_social_link_input.ts";
import { isRelationalLinkKind } from "../links/kinds.ts";
import { mapLinkRowToLinkListItem } from "../links/mappers.ts";
import {
  findLiveRelationalLinkAnyDirection,
  getLinkRowById,
} from "../links/queries.ts";
import { buildLinkMutationReceipt } from "../links/receipts.ts";
import type { LinkState } from "../links/types.ts";
import {
  assertContactEndpointsNotMerged,
  validateRelationalMechanics,
} from "../links/validators.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";

export function seedSocialLink(
  db: AffinityDb,
  input: SeedSocialLinkInput,
): LinkMutationReceipt {
  return withTransaction(db, () => {
    if (!isRelationalLinkKind(input.kind)) {
      throw new AffinityValidationError("invalid relational link kind");
    }
    if (input.fromContactId === input.toContactId) {
      throw new AffinityValidationError("from and to contacts must differ");
    }
    assertContactEndpointsNotMerged(db, input.fromContactId, input.toContactId);
    if (findLiveRelationalLinkAnyDirection(db, input.fromContactId, input.toContactId)) {
      throw new AffinityConflictError(
        "relational link already exists between these contacts",
      );
    }
    const rank = input.rank ?? 0;
    const affinity = input.affinity ?? 0.5;
    const trust = input.trust ?? 0.5;
    const state = (input.state ?? "active") as LinkState;
    validateRelationalMechanics(rank, affinity, trust, state);
    const roleRaw = input.role?.trim() ?? "";
    const roleNormalized = roleRaw.length === 0 ? null : roleRaw;
    const cadenceDays =
      input.cadenceDays === undefined ? null : input.cadenceDays;
    if (cadenceDays !== null && (!Number.isInteger(cadenceDays) || cadenceDays < 1)) {
      throw new AffinityValidationError(
        "cadenceDays must be a positive integer",
      );
    }
    const bondRaw = input.bond?.trim() ?? "";
    const bondNormalized = bondRaw.length === 0 ? null : bondRaw;
    const now = resolveNow(input.now);
    const result = db
      .prepare(
        `INSERT INTO links (
           from_contact_id, to_contact_id, kind, role, is_structural,
           rank, affinity, trust, state, cadence_days, bond,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.fromContactId,
        input.toContactId,
        input.kind,
        roleNormalized,
        rank,
        affinity,
        trust,
        state,
        cadenceDays,
        bondNormalized,
        now,
        now,
      );
    const id = Number(result.lastInsertRowid);
    const row = getLinkRowById(db, id);
    if (!row) {
      throw new AffinityInvariantError("inserted relational link not found");
    }
    return buildLinkMutationReceipt(mapLinkRowToLinkListItem(row), {
      created: [{ kind: "link", id }],
    });
  });
}
