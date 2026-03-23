import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { setContactLifecycle } from "../contacts/set_contact_lifecycle.ts";
import { recordInteraction } from "../events/record_interaction.ts";
import { seedSocialLink } from "../links/seed_social_link.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { getAffinityChart } from "./get_affinity_chart.ts";

describe("getAffinityChart", () => {
  it("includes active and dormant contacts, excludes merged", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: active } = createContact(db, { name: "A", kind: "human" });
    const { primary: dormant } = createContact(db, {
      name: "B",
      kind: "human",
    });
    setContactLifecycle(db, dormant.id, "dormant");
    recordInteraction(db, {
      type: "conversation",
      occurredAt: 10,
      summary: "hello",
      significance: 6,
      participants: [
        { contactId: owner.id, role: "actor", directionality: "mutual" },
        { contactId: active.id, role: "recipient", directionality: "mutual" },
      ],
    });
    const chart = getAffinityChart(db);
    strictEqual(
      chart.nodes.some((n) => n.contactId === active.id),
      true,
    );
    strictEqual(
      chart.nodes.some((n) => n.contactId === dormant.id),
      true,
    );
    strictEqual(chart.edges.length, 1);
    db.close();
  });

  it("excludes edges referencing merged contacts", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    seedSocialLink(db, {
      fromContactId: owner.id,
      toContactId: a.id,
      kind: "personal",
    });
    seedSocialLink(db, {
      fromContactId: owner.id,
      toContactId: b.id,
      kind: "personal",
    });
    db.prepare(
      "UPDATE contacts SET lifecycle_state = 'merged' WHERE id = ?",
    ).run(b.id);
    const chart = getAffinityChart(db);
    strictEqual(
      chart.edges.some((e) => e.toContactId === b.id),
      false,
    );
    strictEqual(
      chart.edges.some((e) => e.toContactId === a.id),
      true,
    );
    db.close();
  });

  it("supports contactIds subset filter", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    seedSocialLink(db, {
      fromContactId: owner.id,
      toContactId: a.id,
      kind: "personal",
    });
    seedSocialLink(db, {
      fromContactId: owner.id,
      toContactId: b.id,
      kind: "personal",
    });
    const subset = getAffinityChart(db, {
      contactIds: [owner.id, a.id],
    });
    strictEqual(subset.nodes.length, 2);
    strictEqual(
      subset.edges.every(
        (e) => e.fromContactId !== b.id && e.toContactId !== b.id,
      ),
      true,
    );
    db.close();
  });
});
