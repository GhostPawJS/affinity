import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { overrideLinkState } from "../links/override_link_state.ts";
import { setStructuralTie } from "../links/set_structural_tie.ts";
import { recordInteraction } from "./record_interaction.ts";

describe("recordInteraction", () => {
  it("creates event and seeds personal link when missing", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: other } = createContact(db, { name: "A", kind: "human" });
    const now = Date.now();
    const r = recordInteraction(db, {
      type: "conversation",
      occurredAt: now - 1000,
      summary: "hello",
      significance: 5,
      participants: [
        { contactId: owner.id, role: "actor" },
        { contactId: other.id, role: "recipient" },
      ],
      now,
    });
    strictEqual(r.primary.type, "conversation");
    const evCount = db
      .prepare("SELECT COUNT(*) AS c FROM events")
      .get() as unknown as { c: number };
    strictEqual(Number(evCount.c), 1);
    const linkCount = db
      .prepare("SELECT COUNT(*) AS c FROM links")
      .get() as unknown as { c: number };
    strictEqual(Number(linkCount.c), 1);
    strictEqual(r.affectedLinks.length, 1);
    strictEqual(r.derivedEffects.length, 1);
    const effectCount = db
      .prepare("SELECT COUNT(*) AS c FROM link_event_effects")
      .get() as unknown as { c: number };
    strictEqual(Number(effectCount.c), 1);
    const rollupCount = db
      .prepare("SELECT COUNT(*) AS c FROM link_rollups")
      .get() as unknown as { c: number };
    strictEqual(Number(rollupCount.c), 1);
    const rollupLinkId = r.affectedLinks[0];
    ok(rollupLinkId !== undefined);
    const rollup = db
      .prepare(
        "SELECT total_meaningful_events AS total FROM link_rollups WHERE link_id = ?",
      )
      .get(rollupLinkId) as { total: number };
    strictEqual(rollup.total, 1);
    db.close();
  });

  it("auto-creates professional links for company contacts", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: company } = createContact(db, {
      name: "Acme",
      kind: "company",
    });
    const r = recordInteraction(db, {
      type: "conversation",
      occurredAt: 10,
      summary: "vendor call",
      significance: 5,
      participants: [
        {
          contactId: owner.id,
          role: "actor",
          directionality: "owner_initiated",
        },
        {
          contactId: company.id,
          role: "recipient",
          directionality: "other_initiated",
        },
      ],
    });
    const professionalLinkId = r.affectedLinks[0];
    ok(professionalLinkId !== undefined);
    const row = db
      .prepare("SELECT kind FROM links WHERE id = ?")
      .get(professionalLinkId) as { kind: string };
    strictEqual(row.kind, "professional");
    db.close();
  });

  it("promotes owner kinship ties to family links", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: sibling } = createContact(db, {
      name: "Sis",
      kind: "human",
    });
    setStructuralTie(db, {
      fromContactId: owner.id,
      toContactId: sibling.id,
      kind: "sibling_of",
    });
    const r = recordInteraction(db, {
      type: "conversation",
      occurredAt: 10,
      summary: "family chat",
      significance: 6,
      participants: [
        { contactId: owner.id, role: "actor", directionality: "mutual" },
        { contactId: sibling.id, role: "recipient", directionality: "mutual" },
      ],
    });
    const familyLinkId = r.affectedLinks[0];
    ok(familyLinkId !== undefined);
    const row = db
      .prepare("SELECT kind FROM links WHERE id = ?")
      .get(familyLinkId) as { kind: string };
    strictEqual(row.kind, "family");
    db.close();
  });

  it("caps mention-only evidence at rank one", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: other } = createContact(db, { name: "A", kind: "human" });
    let linkId = 0;
    for (let index = 0; index < 4; index += 1) {
      const receipt = recordInteraction(db, {
        type: "conversation",
        occurredAt: 10 + index,
        summary: `mention ${index}`,
        significance: 10,
        participants: [
          {
            contactId: owner.id,
            role: "actor",
            directionality: "owner_initiated",
          },
          {
            contactId: other.id,
            role: "mentioned",
            directionality: "observed",
          },
        ],
      });
      linkId = receipt.affectedLinks[0] ?? linkId;
    }
    const row = db
      .prepare("SELECT rank FROM links WHERE id = ?")
      .get(linkId) as { rank: number };
    strictEqual(row.rank <= 1, true);
    db.close();
  });

  it("does not auto-rank broken links until they return active", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: other } = createContact(db, { name: "A", kind: "human" });
    const initial = recordInteraction(db, {
      type: "conversation",
      occurredAt: 10,
      summary: "before break",
      significance: 10,
      participants: [
        { contactId: owner.id, role: "actor", directionality: "mutual" },
        { contactId: other.id, role: "recipient", directionality: "mutual" },
      ],
    });
    const linkId = initial.affectedLinks[0] as number;
    const beforeBroken = db
      .prepare("SELECT rank FROM links WHERE id = ?")
      .get(linkId) as { rank: number };
    overrideLinkState(db, linkId, "broken");
    recordInteraction(db, {
      type: "conversation",
      occurredAt: 11,
      summary: "positive but broken",
      significance: 10,
      participants: [
        { contactId: owner.id, role: "actor", directionality: "mutual" },
        { contactId: other.id, role: "recipient", directionality: "mutual" },
      ],
    });
    const row = db
      .prepare("SELECT rank, state FROM links WHERE id = ?")
      .get(linkId) as { rank: number; state: string };
    strictEqual(row.rank, beforeBroken.rank);
    strictEqual(row.state, "broken");
    db.close();
  });
});
