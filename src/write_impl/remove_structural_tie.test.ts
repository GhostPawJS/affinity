import { strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { createInitializedAffinityDb } from "../lib/test-db.ts";
import { getLinkRowById } from "../links/queries.ts";
import { createContact } from "./create_contact.ts";
import { removeStructuralTie } from "./remove_structural_tie.ts";
import { setStructuralTie } from "./set_structural_tie.ts";

describe("removeStructuralTie", () => {
  it("soft-deletes a structural tie", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    const { primary: link } = setStructuralTie(db, {
      fromContactId: a.id,
      toContactId: b.id,
      kind: "works_at",
    });
    const r = removeStructuralTie(db, link.id, 42);
    strictEqual(r.removed[0]?.kind, "link");
    strictEqual(getLinkRowById(db, link.id), null);
    db.close();
  });

  it("throws when link is relational", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    db.prepare(
      `INSERT INTO links (
         from_contact_id, to_contact_id, kind, is_structural, rank, affinity, trust, state,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(1, 2, "personal", 0, 0, 0.1, 0.2, "active", 1, 1);
    throws(
      () => removeStructuralTie(db, 1),
      (e: unknown) => e instanceof AffinityInvariantError,
    );
    db.close();
  });

  it("throws when already removed", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    const { primary: link } = setStructuralTie(db, {
      fromContactId: a.id,
      toContactId: b.id,
      kind: "works_at",
    });
    removeStructuralTie(db, link.id);
    throws(
      () => removeStructuralTie(db, link.id),
      (e: unknown) => e instanceof AffinityNotFoundError,
    );
    db.close();
  });
});
