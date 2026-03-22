import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { setContactLifecycle } from "../contacts/set_contact_lifecycle.ts";
import { recordInteraction } from "../events/record_interaction.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { getAffinityChart } from "./get_affinity_chart.ts";

describe("getAffinityChart", () => {
  it("includes only active contacts by default and honors observed inclusion", async () => {
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
      chart.nodes.some((node) => node.contactId === active.id),
      true,
    );
    strictEqual(
      chart.nodes.some((node) => node.contactId === dormant.id),
      false,
    );
    strictEqual(chart.edges.length, 1);
    db.close();
  });
});
