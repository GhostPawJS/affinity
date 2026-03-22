import { strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { seedSocialLink } from "../links/seed_social_link.ts";
import { setStructuralTie } from "../links/set_structural_tie.ts";
import { reviseBond } from "./revise_bond.ts";

describe("reviseBond", () => {
  it("updates bond text", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    const { primary: link } = seedSocialLink(db, {
      fromContactId: a.id,
      toContactId: b.id,
      kind: "personal",
    });
    const r = reviseBond(db, link.id, "  old friends  ");
    strictEqual(r.primary.bond, "old friends");
    strictEqual(r.updated[0]?.kind, "link");
    db.close();
  });

  it("clears bond with null", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    const { primary: link } = seedSocialLink(db, {
      fromContactId: a.id,
      toContactId: b.id,
      kind: "personal",
      bond: "x",
    });
    const r = reviseBond(db, link.id, null);
    strictEqual(r.primary.bond, null);
    db.close();
  });

  it("rejects structural link", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    const { primary: link } = setStructuralTie(db, {
      fromContactId: a.id,
      toContactId: b.id,
      kind: "works_at",
    });
    throws(
      () => reviseBond(db, link.id, "nope"),
      (e: unknown) => e instanceof AffinityInvariantError,
    );
    db.close();
  });

  it("rejects merged endpoint", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    const { primary: link } = seedSocialLink(db, {
      fromContactId: a.id,
      toContactId: b.id,
      kind: "personal",
    });
    db.prepare(
      "UPDATE contacts SET lifecycle_state = 'merged' WHERE id = ?",
    ).run(b.id);
    throws(
      () => reviseBond(db, link.id, "x"),
      (e: unknown) => e instanceof AffinityStateError,
    );
    db.close();
  });
});
