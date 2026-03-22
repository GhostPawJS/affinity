import { strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { overrideLinkState } from "../links/override_link_state.ts";
import { seedSocialLink } from "../links/seed_social_link.ts";
import { setStructuralTie } from "../links/set_structural_tie.ts";
import type { LinkState } from "../links/types.ts";

describe("overrideLinkState", () => {
  it("updates relational state", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    const { primary: link } = seedSocialLink(db, {
      fromContactId: a.id,
      toContactId: b.id,
      kind: "personal",
    });
    const r = overrideLinkState(db, link.id, "dormant", { now: 9 });
    strictEqual(r.primary.state, "dormant");
    strictEqual(r.updated[0]?.kind, "link");
    strictEqual(r.affectedLinks[0], link.id);
    const rollup = db
      .prepare("SELECT radar_score FROM link_rollups WHERE link_id = ?")
      .get(link.id) as { radar_score: number };
    strictEqual(typeof rollup.radar_score, "number");
    db.close();
  });

  it("no-ops when state unchanged", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    const { primary: link } = seedSocialLink(db, {
      fromContactId: a.id,
      toContactId: b.id,
      kind: "personal",
    });
    const r = overrideLinkState(db, link.id, "active");
    strictEqual(r.updated.length, 0);
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
      () => overrideLinkState(db, link.id, "dormant"),
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
      () => overrideLinkState(db, link.id, "strained"),
      (e: unknown) => e instanceof AffinityStateError,
    );
    db.close();
  });

  it("rejects invalid state string at runtime", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    const { primary: link } = seedSocialLink(db, {
      fromContactId: a.id,
      toContactId: b.id,
      kind: "personal",
    });
    throws(
      () => overrideLinkState(db, link.id, "merged" as unknown as LinkState),
      (e: unknown) => e instanceof AffinityValidationError,
    );
    db.close();
  });
});
