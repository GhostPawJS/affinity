import type { AffinityDb } from "../database.ts";
import { getContactRowById } from "../contacts/queries.ts";
import { AffinityError } from "../lib/errors/affinity_error.ts";
import { isAffinityError } from "../lib/errors/is_affinity_error.ts";
import type { ContactRow } from "../lib/types/contact_row.ts";
import type { LinkRow } from "../lib/types/link_row.ts";
import { normalizeIdentityKey } from "../identities/normalize.ts";
import { getLinkRowById } from "../links/queries.ts";
import { toContactEntityRef, toLinkEntityRef } from "./tool_ref.ts";
import {
  toolFailure,
  toolNeedsClarification,
  type ToolFailure,
  type ToolNeedsClarification,
  type ToolResult,
} from "./tool_types.ts";

export type ContactLocator =
  | { contactId: number }
  | { identity: { type: string; value: string } };

export type LinkLocator =
  | { linkId: number }
  | {
      endpoints: {
        fromContactId: number;
        toContactId: number;
        kind?: string | undefined;
        role?: string | null | undefined;
        isStructural?: boolean | undefined;
      };
    };

export type ResolvedTarget<T> =
  | { ok: true; value: T }
  | { ok: false; result: ToolFailure | ToolNeedsClarification };

export function resolveContactLocator(
  db: AffinityDb,
  locator: ContactLocator,
  field = "contact",
): ResolvedTarget<ContactRow> {
  if ("contactId" in locator) {
    const row = getContactRowById(db, locator.contactId);
    if (!row) {
      return {
        ok: false,
        result: toolFailure(
          "domain",
          "not_found",
          "Contact not found.",
          `No live contact exists for \`${field}.contactId = ${locator.contactId}\`.`,
        ),
      };
    }
    return { ok: true, value: row };
  }

  const normalizedKey = normalizeIdentityKey(
    locator.identity.type,
    locator.identity.value,
  );
  const row = db
    .prepare(
      `SELECT c.id, c.name, c.kind, c.lifecycle_state, c.is_owner,
              c.merged_into_contact_id, c.created_at, c.updated_at, c.deleted_at
       FROM identities i
       INNER JOIN contacts c ON c.id = i.contact_id
       WHERE i.removed_at IS NULL
         AND c.deleted_at IS NULL
         AND i.normalized_key = ?
       LIMIT 2`,
    )
    .all(normalizedKey) as unknown as ContactRow[];
  if (row.length === 0) {
    return {
      ok: false,
      result: toolFailure(
        "domain",
        "not_found",
        "Contact not found.",
        `No live contact matches identity \`${locator.identity.type}:${locator.identity.value}\`.`,
      ),
    };
  }
  if (row.length > 1) {
    return {
      ok: false,
      result: toolNeedsClarification(
        "multiple_plausible_matches",
        "More than one contact matches that identity locator.",
        [field],
        {
          entities: row.map(toContactEntityRef),
          options: row.map((contact) => ({
            label: `${contact.name} (#${contact.id})`,
            value: contact.id,
          })),
        },
      ),
    };
  }
  return { ok: true, value: row[0]! };
}

export function resolveLinkLocator(
  db: AffinityDb,
  locator: LinkLocator,
  field = "link",
): ResolvedTarget<LinkRow> {
  if ("linkId" in locator) {
    const row = getLinkRowById(db, locator.linkId);
    if (!row) {
      return {
        ok: false,
        result: toolFailure(
          "domain",
          "not_found",
          "Link not found.",
          `No live link exists for \`${field}.linkId = ${locator.linkId}\`.`,
        ),
      };
    }
    return { ok: true, value: row };
  }

  const { endpoints } = locator;
  const clauses = [
    "removed_at IS NULL",
    "from_contact_id = ?",
    "to_contact_id = ?",
  ];
  const params: Array<number | string> = [
    endpoints.fromContactId,
    endpoints.toContactId,
  ];
  if (endpoints.kind !== undefined) {
    clauses.push("kind = ?");
    params.push(endpoints.kind);
  }
  if (endpoints.role !== undefined) {
    clauses.push("COALESCE(role, '') = ?");
    params.push(endpoints.role ?? "");
  }
  if (endpoints.isStructural !== undefined) {
    clauses.push("is_structural = ?");
    params.push(endpoints.isStructural ? 1 : 0);
  }
  const rows = db
    .prepare(
      `SELECT id, from_contact_id, to_contact_id, kind, role, is_structural,
              rank, affinity, trust, state, cadence_days, bond,
              created_at, updated_at, removed_at
       FROM links
       WHERE ${clauses.join(" AND ")}
       ORDER BY id ASC
       LIMIT 10`,
    )
    .all(...params) as unknown as LinkRow[];
  if (rows.length === 0) {
    return {
      ok: false,
      result: toolFailure(
        "domain",
        "not_found",
        "Link not found.",
        "No live link matches the supplied endpoint locator.",
      ),
    };
  }
  if (rows.length > 1) {
    return {
      ok: false,
      result: toolNeedsClarification(
        "ambiguous_target",
        "More than one live link matches those endpoints.",
        [field],
        {
          entities: rows.map(toLinkEntityRef),
          options: rows.map((link) => ({
            label: `${link.kind} #${link.id}`,
            value: link.id,
          })),
        },
      ),
    };
  }
  return { ok: true, value: rows[0]! };
}

export function mapErrorToToolFailure(
  error: unknown,
  summary = "The tool failed.",
): ToolFailure {
  if (isAffinityError(error)) {
    return toolFailure(
      "domain",
      affinityErrorCodeToToolCode(error),
      summary,
      error.message,
    );
  }
  if (error instanceof Error) {
    return toolFailure("system", "system_error", summary, error.message);
  }
  return toolFailure(
    "system",
    "system_error",
    summary,
    "Unknown system error.",
  );
}

export function withToolHandling<TData>(
  operation: () => ToolResult<TData>,
  summary = "The tool failed.",
): ToolResult<TData> {
  try {
    return operation();
  } catch (error) {
    return mapErrorToToolFailure(error, summary);
  }
}

function affinityErrorCodeToToolCode(
  error: AffinityError,
): ToolFailure["error"]["code"] {
  switch (error.code) {
    case "NOT_FOUND":
      return "not_found";
    case "CONFLICT":
      return "conflict";
    case "VALIDATION":
      return "invalid_input";
    case "STATE":
      return "invalid_state";
    case "MERGE":
      return "constraint_violation";
    case "INVARIANT":
      return "constraint_violation";
    default:
      return "system_error";
  }
}
