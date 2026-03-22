import { strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import { createInitializedAffinityDb } from "../lib/test-db.ts";
import type { RelationalLinkKind } from "../links/types.ts";
import { createContact } from "./create_contact.ts";
import { seedSocialLink } from "./seed_social_link.ts";

describe("seedSocialLink", () => {
  it("inserts with default mechanics", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    const r = seedSocialLink(db, {
      fromContactId: a.id,
      toContactId: b.id,
      kind: "personal",
    });
    strictEqual(r.primary.kind, "personal");
    strictEqual(r.primary.rank, 0);
    strictEqual(r.primary.state, "active");
    strictEqual(r.created[0]?.kind, "link");
    db.close();
  });

  it("rejects structural kind", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    throws(
      () =>
        seedSocialLink(db, {
          fromContactId: a.id,
          toContactId: b.id,
          kind: "works_at" as RelationalLinkKind,
        }),
      (e: unknown) => e instanceof AffinityValidationError,
    );
    db.close();
  });

  it("rejects missing contact", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    throws(
      () =>
        seedSocialLink(db, {
          fromContactId: a.id,
          toContactId: 999,
          kind: "personal",
        }),
      (e: unknown) => e instanceof AffinityNotFoundError,
    );
    db.close();
  });

  it("rejects merged endpoint", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    db.prepare(
      "UPDATE contacts SET lifecycle_state = 'merged' WHERE id = ?",
    ).run(b.id);
    throws(
      () =>
        seedSocialLink(db, {
          fromContactId: a.id,
          toContactId: b.id,
          kind: "personal",
        }),
      (e: unknown) => e instanceof AffinityStateError,
    );
    db.close();
  });
});
