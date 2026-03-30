import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { recordInteraction } from "../events/record_interaction.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { seedSocialLink } from "../links/seed_social_link.ts";
import { setStructuralTie } from "../links/set_structural_tie.ts";
import { dismissDuplicate } from "../merges/dismiss_duplicate.ts";
import { reviewAffinityToolHandler } from "./review_affinity_tool.ts";

describe("review_affinity_tool", () => {
  it("asks for a required contact on contact journal views", async () => {
    const db = await createInitializedAffinityDb();
    const result = reviewAffinityToolHandler(db, {
      view: "events.contact_journal",
    });
    strictEqual(result.ok, false);
    if (!result.ok) {
      strictEqual(result.outcome, "needs_clarification");
    }
    db.close();
  });

  it("returns clarification for ambiguous endpoint-based link locators", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    seedSocialLink(db, {
      fromContactId: a.id,
      toContactId: b.id,
      kind: "personal",
    });
    setStructuralTie(db, {
      fromContactId: a.id,
      toContactId: b.id,
      kind: "friend_of",
    });

    const result = reviewAffinityToolHandler(db, {
      view: "events.link_timeline",
      link: { endpoints: { fromContactId: a.id, toContactId: b.id } },
    });

    strictEqual(result.ok, false);
    if (!result.ok) {
      strictEqual(result.outcome, "needs_clarification");
    }
    db.close();
  });

  it("returns chart data for graph review", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: other } = createContact(db, {
      name: "Ada",
      kind: "human",
    });
    recordInteraction(db, {
      type: "conversation",
      occurredAt: 10,
      summary: "hello",
      significance: 5,
      participants: [
        { contactId: owner.id, role: "actor", directionality: "mutual" },
        { contactId: other.id, role: "recipient", directionality: "mutual" },
      ],
    });

    const result = reviewAffinityToolHandler(db, { view: "graph.chart" });
    strictEqual(result.ok, true);
    if (result.ok) {
      strictEqual(result.data.chart?.nodes.length, 2);
      strictEqual(result.data.chart?.edges.length, 1);
    }
    db.close();
  });

  it("contacts.duplicates with includeDismissed returns dismissed pair marked", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "Sarah", kind: "human" });
    const { primary: b } = createContact(db, { name: "Sarah", kind: "human" });

    dismissDuplicate(db, a.id, b.id, "different people");

    const withoutFlag = reviewAffinityToolHandler(db, {
      view: "contacts.duplicates",
    });
    strictEqual(withoutFlag.ok, true);
    if (withoutFlag.ok) {
      strictEqual(
        withoutFlag.data.items.some((item) => item.id === Math.min(a.id, b.id)),
        false,
      );
    }

    const withFlag = reviewAffinityToolHandler(db, {
      view: "contacts.duplicates",
      includeDismissed: true,
    });
    strictEqual(withFlag.ok, true);
    if (withFlag.ok) {
      strictEqual(
        withFlag.data.items.some((item) => item.id === Math.min(a.id, b.id)),
        true,
      );
    }

    db.close();
  });

  it("merges.dismissed view returns dismissed pairs", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "Sarah", kind: "human" });
    const { primary: b } = createContact(db, { name: "Sarah", kind: "human" });

    dismissDuplicate(db, a.id, b.id, "reviewed");

    const result = reviewAffinityToolHandler(db, { view: "merges.dismissed" });
    strictEqual(result.ok, true);
    if (result.ok) {
      strictEqual(result.data.count, 1);
      strictEqual(result.data.items[0]?.id, Math.min(a.id, b.id));
    }

    db.close();
  });

  it("rejects includeDismissed on non-duplicate views", async () => {
    const db = await createInitializedAffinityDb();

    const result = reviewAffinityToolHandler(db, {
      view: "contacts.list",
      includeDismissed: true,
    });
    strictEqual(result.ok, false);
    if (!result.ok) {
      strictEqual(result.outcome, "error");
    }

    db.close();
  });
});
