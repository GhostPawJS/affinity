import { strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { AffinityConflictError } from "../lib/errors/affinity_conflict_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import { createInitializedAffinityDb } from "../lib/test-db.ts";
import type { CreateContactInput } from "../lib/types/create_contact_input.ts";
import { createContact } from "./create_contact.ts";

describe("createContact", () => {
  it("creates a contact and receipt", async () => {
    const db = await createInitializedAffinityDb();
    const r = createContact(db, { name: " Ada ", kind: "human" });
    strictEqual(r.primary.name, "Ada");
    strictEqual(r.primary.kind, "human");
    strictEqual(r.created[0]?.kind, "contact");
    strictEqual(r.updated.length, 0);
    db.close();
  });

  it("bootstraps the owner exactly once", async () => {
    const db = await createInitializedAffinityDb();
    createContact(db, { name: "Owner", kind: "human", bootstrapOwner: true });
    throws(
      () =>
        createContact(db, {
          name: "Other",
          kind: "human",
          bootstrapOwner: true,
        }),
      (e: unknown) => e instanceof AffinityConflictError,
    );
    db.close();
  });

  it("rejects empty name", async () => {
    const db = await createInitializedAffinityDb();
    throws(
      () => createContact(db, { name: "   ", kind: "human" }),
      (e: unknown) => e instanceof AffinityValidationError,
    );
    db.close();
  });

  it("rejects invalid kind", async () => {
    const db = await createInitializedAffinityDb();
    throws(
      () =>
        createContact(db, {
          name: "X",
          kind: "nope",
        } as unknown as CreateContactInput),
      (e: unknown) => e instanceof AffinityValidationError,
    );
    db.close();
  });
});
