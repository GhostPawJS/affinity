import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import {
  AffinityConflictError,
  AffinityInvariantError,
  AffinityMergeError,
  AffinityNotFoundError,
  AffinityStateError,
  AffinityValidationError,
} from "../errors.ts";
import { addIdentity } from "../identities/add_identity.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { seedSocialLink } from "../links/seed_social_link.ts";
import { setStructuralTie } from "../links/set_structural_tie.ts";
import {
  mapErrorToToolFailure,
  resolveContactLocator,
  resolveLinkLocator,
  withToolHandling,
} from "./tool_resolvers.ts";

it("resolves exact identities and disambiguates endpoint kinds, roles and structure", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const a = createContact(db, { name: "A", kind: "human" }).primary;
    const b = createContact(db, { name: "B", kind: "human" }).primary;
    addIdentity(db, a.id, { type: "email", value: "A@example.com" });
    const contact = resolveContactLocator(db, {
      identity: { type: "email", value: "a@example.com" },
    });
    ok(contact.ok);
    strictEqual(contact.value.id, a.id);
    const missing = resolveContactLocator(db, {
      identity: { type: "email", value: "missing@example.com" },
    });
    ok(!missing.ok);
    strictEqual(missing.result.outcome, "error");
    const link = seedSocialLink(db, {
      fromContactId: a.id,
      toContactId: b.id,
      kind: "personal",
    }).primary;
    setStructuralTie(db, {
      fromContactId: a.id,
      toContactId: b.id,
      kind: "friend_of",
      role: "school",
    });
    const endpoints = { fromContactId: a.id, toContactId: b.id };
    const ambiguous = resolveLinkLocator(db, { endpoints }, "relationship");
    ok(!ambiguous.ok);
    strictEqual(ambiguous.result.outcome, "needs_clarification");
    if (ambiguous.result.outcome === "needs_clarification") {
      deepStrictEqual(ambiguous.result.clarification.missing, ["relationship"]);
      strictEqual(ambiguous.result.clarification.options?.length, 2);
    }
    for (const role of [null, ""]) {
      const resolved = resolveLinkLocator(db, {
        endpoints: {
          ...endpoints,
          kind: "personal",
          role,
          isStructural: false,
        },
      });
      ok(resolved.ok);
      strictEqual(resolved.value.id, link.id);
    }
    const structural = resolveLinkLocator(db, {
      endpoints: { ...endpoints, role: "school", isStructural: true },
    });
    ok(structural.ok);
    strictEqual(structural.value.kind, "friend_of");
    const absent = resolveLinkLocator(db, {
      endpoints: { ...endpoints, kind: "professional" },
    });
    ok(!absent.ok);
    strictEqual(absent.result.outcome, "error");
  } finally {
    db.close();
  }
});

it("maps domain and arbitrary thrown errors without losing their message", () => {
  for (const [error, code] of [
    [new AffinityNotFoundError("missing"), "not_found"],
    [new AffinityConflictError("conflict"), "conflict"],
    [new AffinityValidationError("invalid"), "invalid_input"],
    [new AffinityStateError("state"), "invalid_state"],
    [new AffinityMergeError("merge"), "constraint_violation"],
    [new AffinityInvariantError("invariant"), "constraint_violation"],
  ] as const) {
    const result = mapErrorToToolFailure(error);
    strictEqual(result.error.kind, "domain");
    strictEqual(result.error.code, code);
    strictEqual(result.error.message, error.message);
  }
  strictEqual(
    mapErrorToToolFailure("oops").error.message,
    "Unknown system error.",
  );
  const caught = withToolHandling(() => {
    throw new Error("disk failed");
  }, "Write failed");
  ok(!caught.ok && caught.outcome === "error");
  strictEqual(caught.summary, "Write failed");
  strictEqual(caught.error.message, "disk failed");
});
