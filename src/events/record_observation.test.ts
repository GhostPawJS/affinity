import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { recordObservation } from "./record_observation.ts";

describe("recordObservation", () => {
  it("seeds observed link for two non-owners", async () => {
    const db = await createInitializedAffinityDb();
    createContact(db, { name: "Me", kind: "human", bootstrapOwner: true });
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    const r = recordObservation(db, {
      occurredAt: 1,
      summary: "saw them together",
      significance: 3,
      participants: [
        { contactId: a.id, role: "observer" },
        { contactId: b.id, role: "subject" },
      ],
    });
    strictEqual(r.primary.type, "observation");
    const linkCount = db
      .prepare("SELECT COUNT(*) AS c FROM links")
      .get() as unknown as { c: number };
    strictEqual(Number(linkCount.c), 1);
    strictEqual(r.derivedEffects.length, 1);
    const affectedLinkId = r.affectedLinks[0];
    ok(affectedLinkId !== undefined);
    const row = db
      .prepare("SELECT kind, trust, rank FROM links WHERE id = ?")
      .get(affectedLinkId) as { kind: string; trust: number; rank: number };
    strictEqual(row.kind, "observed");
    strictEqual(row.trust <= 0.35, true);
    strictEqual(row.rank <= 1, true);
    db.close();
  });

  it("keeps observational trust capped across repeated evidence", async () => {
    const db = await createInitializedAffinityDb();
    createContact(db, { name: "Me", kind: "human", bootstrapOwner: true });
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    let linkId = 0;
    for (let index = 0; index < 4; index += 1) {
      const receipt = recordObservation(db, {
        occurredAt: 1 + index,
        summary: `sighting ${index}`,
        significance: 8,
        participants: [
          { contactId: a.id, role: "observer" },
          { contactId: b.id, role: "subject" },
        ],
      });
      linkId = receipt.affectedLinks[0] ?? linkId;
    }
    const row = db
      .prepare("SELECT trust FROM links WHERE id = ?")
      .get(linkId) as { trust: number };
    strictEqual(row.trust <= 0.35, true);
    db.close();
  });

  it("does not infer a clique from third-party group observation", async () => {
    const db = await createInitializedAffinityDb();
    createContact(db, { name: "Me", kind: "human", bootstrapOwner: true });
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    const { primary: c } = createContact(db, { name: "C", kind: "human" });
    const receipt = recordObservation(db, {
      occurredAt: 1,
      summary: "saw them all together",
      significance: 4,
      participants: [
        { contactId: a.id, role: "observer" },
        { contactId: b.id, role: "subject" },
        { contactId: c.id, role: "subject" },
      ],
    });
    strictEqual(receipt.affectedLinks.length, 0);
    const linkCount = db.prepare("SELECT COUNT(*) AS c FROM links").get() as {
      c: number;
    };
    strictEqual(Number(linkCount.c), 0);
    db.close();
  });
});
