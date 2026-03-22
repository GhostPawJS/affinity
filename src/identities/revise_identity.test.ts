import { strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { AffinityConflictError } from "../lib/errors/affinity_conflict_error.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { addIdentity } from "./add_identity.ts";
import { reviseIdentity } from "./revise_identity.ts";

describe("reviseIdentity", () => {
  it("updates label only", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    const { primary: id } = addIdentity(db, c.id, {
      type: "email",
      value: "a@b",
    });
    const r = reviseIdentity(db, id.id, { label: "work" });
    strictEqual(r.primary.label, "work");
    db.close();
  });

  it("re-runs collision when value changes", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c1 } = createContact(db, { name: "A", kind: "human" });
    const { primary: c2 } = createContact(db, { name: "B", kind: "human" });
    const { primary: i1 } = addIdentity(db, c1.id, {
      type: "email",
      value: "a@b",
    });
    addIdentity(db, c2.id, { type: "email", value: "c@d" });
    throws(
      () => reviseIdentity(db, i1.id, { value: "c@d" }),
      (e: unknown) => e instanceof AffinityConflictError,
    );
    db.close();
  });
});
