import { strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import { createInitializedAffinityDb } from "../lib/test-db.ts";
import { createContact } from "./create_contact.ts";
import { reviseContact } from "./revise_contact.ts";

describe("reviseContact", () => {
  it("updates name", async () => {
    const db = await createInitializedAffinityDb();
    const { primary } = createContact(db, { name: " Ada ", kind: "human" });
    const r = reviseContact(db, primary.id, { name: "Ada Lovelace" });
    strictEqual(r.primary.name, "Ada Lovelace");
    strictEqual(r.updated[0]?.kind, "contact");
    db.close();
  });

  it("no-ops when patch is empty", async () => {
    const db = await createInitializedAffinityDb();
    const { primary } = createContact(db, { name: "A", kind: "human" });
    const r = reviseContact(db, primary.id, {});
    strictEqual(r.primary.name, "A");
    strictEqual(r.updated.length, 0);
    db.close();
  });

  it("throws when contact missing", async () => {
    const db = await createInitializedAffinityDb();
    throws(
      () => reviseContact(db, 999, { name: "X" }),
      (e: unknown) => e instanceof AffinityNotFoundError,
    );
    db.close();
  });

  it("rejects merged contacts", async () => {
    const db = await createInitializedAffinityDb();
    const { primary } = createContact(db, { name: "M", kind: "human" });
    db.prepare(
      "UPDATE contacts SET lifecycle_state = 'merged' WHERE id = ?",
    ).run(primary.id);
    throws(
      () => reviseContact(db, primary.id, { name: "X" }),
      (e: unknown) => e instanceof AffinityStateError,
    );
    db.close();
  });

  it("rejects blank name", async () => {
    const db = await createInitializedAffinityDb();
    const { primary } = createContact(db, { name: "A", kind: "human" });
    throws(
      () => reviseContact(db, primary.id, { name: "  " }),
      (e: unknown) => e instanceof AffinityValidationError,
    );
    db.close();
  });
});
