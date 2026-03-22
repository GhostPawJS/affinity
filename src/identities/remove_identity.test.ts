import { strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { getIdentityRowById } from "../identities/queries.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { addIdentity } from "./add_identity.ts";
import { removeIdentity } from "./remove_identity.ts";

describe("removeIdentity", () => {
  it("soft-deletes and lists removed ref", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    const { primary: id } = addIdentity(db, c.id, {
      type: "email",
      value: "a@b",
    });
    const r = removeIdentity(db, id.id, 99);
    strictEqual(r.removed[0]?.kind, "identity");
    strictEqual(getIdentityRowById(db, id.id), null);
    db.close();
  });

  it("throws when already removed", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    const { primary: id } = addIdentity(db, c.id, {
      type: "email",
      value: "a@b",
    });
    removeIdentity(db, id.id);
    throws(
      () => removeIdentity(db, id.id),
      (e: unknown) => e instanceof AffinityNotFoundError,
    );
    db.close();
  });
});
