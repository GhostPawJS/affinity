import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { getLinksBetween } from "./get_links_between.ts";
import { seedSocialLink } from "./seed_social_link.ts";
import { setStructuralTie } from "./set_structural_tie.ts";

describe("getLinksBetween", () => {
  it("returns empty array when no links exist", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    strictEqual(getLinksBetween(db, a.id, b.id).length, 0);
    db.close();
  });

  it("returns a relational link in either direction", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    seedSocialLink(db, {
      fromContactId: a.id,
      toContactId: b.id,
      kind: "personal",
    });
    const forwardLinks = getLinksBetween(db, a.id, b.id);
    strictEqual(forwardLinks.length, 1);
    strictEqual(forwardLinks[0]?.fromContactId, a.id);
    strictEqual(forwardLinks[0]?.toContactId, b.id);
    // Same result regardless of argument order
    const reverseLinks = getLinksBetween(db, b.id, a.id);
    strictEqual(reverseLinks.length, 1);
    strictEqual(reverseLinks[0]?.fromContactId, a.id);
    db.close();
  });

  it("returns structural links too", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: person } = createContact(db, { name: "P", kind: "human" });
    const { primary: org } = createContact(db, {
      name: "Org",
      kind: "company",
    });
    setStructuralTie(db, {
      fromContactId: person.id,
      toContactId: org.id,
      kind: "works_at",
    });
    const links = getLinksBetween(db, person.id, org.id);
    strictEqual(links.length, 1);
    strictEqual(links[0]?.kind, "works_at");
    db.close();
  });

  it("does not return links to unrelated contacts", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    const { primary: c } = createContact(db, { name: "C", kind: "human" });
    seedSocialLink(db, {
      fromContactId: a.id,
      toContactId: c.id,
      kind: "personal",
    });
    strictEqual(getLinksBetween(db, a.id, b.id).length, 0);
    db.close();
  });
});
