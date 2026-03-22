import { strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { setStructuralTie } from "../links/set_structural_tie.ts";
import type { StructuralLinkKind } from "../links/types.ts";

describe("setStructuralTie", () => {
  it("inserts a structural tie", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    const r = setStructuralTie(db, {
      fromContactId: a.id,
      toContactId: b.id,
      kind: "works_at",
    });
    strictEqual(r.primary.kind, "works_at");
    strictEqual(r.created[0]?.kind, "link");
    const n0 = db.prepare("SELECT COUNT(*) AS c FROM links").get() as {
      c: number;
    };
    strictEqual(Number(n0.c), 1);
    db.close();
  });

  it("upserts same (from, to, kind, role) without duplicate rows", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    const first = setStructuralTie(db, {
      fromContactId: a.id,
      toContactId: b.id,
      kind: "parent_of",
    });
    const second = setStructuralTie(db, {
      fromContactId: a.id,
      toContactId: b.id,
      kind: "parent_of",
      now: 99,
    });
    strictEqual(second.primary.id, first.primary.id);
    strictEqual(second.updated[0]?.kind, "link");
    const n2 = db.prepare("SELECT COUNT(*) AS c FROM links").get() as {
      c: number;
    };
    strictEqual(Number(n2.c), 1);
    db.close();
  });

  it("rejects self-loop", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    throws(
      () =>
        setStructuralTie(db, {
          fromContactId: a.id,
          toContactId: a.id,
          kind: "works_at",
        }),
      (e: unknown) => e instanceof AffinityValidationError,
    );
    db.close();
  });

  it("rejects missing endpoint", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    throws(
      () =>
        setStructuralTie(db, {
          fromContactId: a.id,
          toContactId: 999,
          kind: "works_at",
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
        setStructuralTie(db, {
          fromContactId: a.id,
          toContactId: b.id,
          kind: "works_at",
        }),
      (e: unknown) => e instanceof AffinityStateError,
    );
    db.close();
  });

  it("rejects non-structural kind", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    throws(
      () =>
        setStructuralTie(db, {
          fromContactId: a.id,
          toContactId: b.id,
          kind: "personal" as StructuralLinkKind,
        }),
      (e: unknown) => e instanceof AffinityValidationError,
    );
    db.close();
  });
});
