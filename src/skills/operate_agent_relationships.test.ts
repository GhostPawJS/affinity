import assert from "node:assert/strict";
import { test } from "node:test";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import * as read from "../read.ts";
import { humanResult } from "../surfaces/cli_output.ts";
import { manageContactToolHandler } from "../tools/manage_contact_tool.ts";
import { searchAffinityToolHandler } from "../tools/search_affinity_tool.ts";
import * as write from "../write.ts";
import {
  getAffinitySkillByName,
  operateAgentRelationshipsSkill,
} from "./index.ts";
import { expectSuccess } from "./skill_test_utils.ts";

test("agent coaching profiles show promises, owner decisions, and verified trust outcomes", async () => {
  const db = await createInitializedAffinityDb();
  try {
    assert.equal(
      getAffinitySkillByName("operate-agent-relationships"),
      operateAgentRelationshipsSkill,
    );
    for (const phrase of [
      "custom:<system>-agent=<id>",
      "actor",
      "next slot",
      "kept",
      "broken",
      "without a due date",
      "task tool",
      "cadenceDays",
    ])
      assert.ok(
        operateAgentRelationshipsSkill.content.includes(phrase),
        phrase,
      );
    const owner = write.createContact(db, {
      name: "Operator",
      kind: "human",
      bootstrapOwner: true,
    }).primary;
    const agent = expectSuccess(
      manageContactToolHandler(db, {
        action: "create",
        input: {
          name: "Agent",
          kind: "agent",
          identities: [{ type: "custom:system-agent", value: "worker-1" }],
        },
      }),
    ).data.primary;
    assert.equal(read.searchContacts(db, "worker-1")[0]?.id, agent.id);
    const search = expectSuccess(
      searchAffinityToolHandler(db, { query: "worker-1", kind: "agent" }),
    );
    assert.equal(search.entities.length, 1);
    assert.equal(search.entities[0]?.id, agent.id);
    write.addDateAnchor(db, {
      target: { kind: "contact", contactId: agent.id },
      recurrenceKind: "birthday",
      anchorMonth: 1,
      anchorDay: 2,
      significance: 1,
      summary: "Creation day",
      now: Date.UTC(2026, 0, 1),
    });
    assert.equal(
      read.listUpcomingDates(
        db,
        { contactKind: "agent", horizonDays: 7 },
        { now: Date.UTC(2026, 0, 1) },
      ).length,
      1,
    );
    const link = write.seedSocialLink(db, {
      fromContactId: owner.id,
      toContactId: agent.id,
      kind: "professional",
      cadenceDays: 7,
    }).primary;
    const promise = write.recordCommitment(db, {
      commitmentType: "promise",
      summary: "Apply agreed change",
      occurredAt: 1,
      dueAt: 100,
      significance: 6,
      participants: [
        { contactId: agent.id, role: "actor" },
        { contactId: owner.id, role: "recipient" },
      ],
    }).primary;
    const decision = write.recordCommitment(db, {
      commitmentType: "promise",
      summary: "Choose next scope",
      occurredAt: 1,
      significance: 3,
      participants: [{ contactId: owner.id, role: "actor" }],
    }).primary;
    const profile = read.getContactProfile(db, agent.id, { now: 200 });
    assert.ok(profile);
    assert.equal(profile.openCommitments?.length, 1);
    const commitment = profile.openCommitments?.[0];
    assert.equal(commitment?.eventId, promise.id);
    assert.equal(commitment?.type, "promise");
    assert.equal(commitment?.summary, "Apply agreed change");
    assert.equal(commitment?.dueAt, 100);
    assert.equal(commitment?.overdue, true);
    assert.equal(
      read
        .getContactProfile(db, owner.id)
        ?.openCommitments?.find((item) => item.eventId === decision.id)?.dueAt,
      null,
    );
    const rendered = humanResult({ data: { detail: profile } });
    assert.match(
      rendered,
      new RegExp(
        `#${promise.id} promise · Apply agreed change · due .*OVERDUE`,
      ),
    );
    const trustBefore = read.getLinkDetail(db, link.id)?.link.trust ?? 0;
    write.resolveCommitment(db, promise.id, "kept", {
      resolvingEvent: {
        type: "promise",
        summary: "Verified change",
        significance: 6,
        occurredAt: 200,
      },
    });
    const trustKept = read.getLinkDetail(db, link.id)?.link.trust ?? 0;
    assert.ok(trustKept > trustBefore);
    assert.equal(
      read.getContactProfile(db, agent.id)?.openCommitments?.length,
      0,
    );
    const missed = write.recordCommitment(db, {
      commitmentType: "promise",
      summary: "Next change",
      occurredAt: 2,
      dueAt: 300,
      significance: 6,
      participants: [
        { contactId: agent.id, role: "actor" },
        { contactId: owner.id, role: "recipient" },
      ],
    }).primary;
    write.resolveCommitment(db, missed.id, "broken");
    assert.ok((read.getLinkDetail(db, link.id)?.link.trust ?? 1) < trustKept);
  } finally {
    db.close();
  }
});

test("a direct agent interaction creates a professional relationship", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const owner = write.createContact(db, {
      name: "Owner",
      kind: "human",
      bootstrapOwner: true,
    }).primary;
    const agent = write.createContact(db, {
      name: "Agent",
      kind: "agent",
    }).primary;
    write.recordInteraction(db, {
      type: "conversation",
      summary: "Individual review",
      occurredAt: 1,
      significance: 4,
      participants: [
        { contactId: owner.id, role: "actor" },
        { contactId: agent.id, role: "recipient" },
      ],
    });
    assert.equal(read.listOwnerSocialLinks(db)[0]?.kind, "professional");
  } finally {
    db.close();
  }
});
