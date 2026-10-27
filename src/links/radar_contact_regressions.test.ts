import assert from "node:assert/strict";
import { test } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { recordCommitment } from "../events/record_commitment.ts";
import { recordInteraction } from "../events/record_interaction.ts";
import { resolveCommitment } from "../events/resolve_commitment.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { recordEventToolHandler } from "../tools/record_event_tool.ts";
import { listRadar } from "./list_radar.ts";
import { refreshLinkRollup } from "./rollups.ts";

test("radar explains overdue promises and drift; commitments and resolutions preserve contact gaps", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const now = Date.parse("2026-10-28T12:00Z");
    const owner = createContact(db, {
      name: "Owner",
      kind: "human",
      bootstrapOwner: true,
    }).primary;
    const contacts = ["Lukas", "Svenja", "Tobias", "Recent"].map(
      (name) => createContact(db, { name, kind: "human" }).primary,
    );
    const tobiasContact = contacts[2];
    assert.ok(tobiasContact);
    const participants = (id: number) => [
      { contactId: owner.id, role: "actor" as const },
      { contactId: id, role: "recipient" as const },
    ];
    for (const contact of contacts)
      recordInteraction(db, {
        type: "conversation",
        occurredAt:
          contact.name === "Recent" ? now : Date.parse("2026-03-28T12:00Z"),
        summary: "Conversation",
        significance: 5,
        participants: participants(contact.id),
        now,
      });
    const before = listRadar(db, undefined, { now }).find(
      (r) => r.contactId === contacts[2]?.id,
    );
    const promises = contacts
      .slice(0, 3)
      .filter((c) => c.name !== "Svenja")
      .map((c) =>
        recordCommitment(db, {
          commitmentType: "promise",
          occurredAt: now,
          dueAt: Date.parse("2026-10-15T23:59:59.999Z"),
          summary: `Proposal for ${c.name}`,
          significance: 5,
          participants: participants(c.id),
          now,
        }),
      );
    const rows = listRadar(db, undefined, { now });
    const lukas = rows.find((r) => r.contactId === contacts[0]?.id);
    assert.ok(lukas);
    assert.ok(lukas.reasons?.includes("overdue_commitment"));
    assert.match(
      lukas.recommendedReason,
      /Overdue promise: Proposal for Lukas \(due 2026-10-15\)/,
    );
    const svenja = rows.find((r) => r.contactId === contacts[1]?.id);
    assert.deepEqual(svenja?.reasons, ["drift"]);
    assert.match(
      svenja?.recommendedReason ?? "",
      /No contact for 214 days \(cadence \d+ days\)/,
    );
    assert.deepEqual(rows.at(-1)?.reasons, []);
    assert.equal(rows.at(-1)?.contactId, contacts[3]?.id);
    const tobias = rows.find((r) => r.contactId === contacts[2]?.id);
    assert.ok(tobias);
    assert.equal(tobias.recencyScore, before?.recencyScore);
    assert.ok(tobias?.reasons?.includes("drift"));
    for (const resolution of ["kept", "broken", "cancelled"] as const) {
      const p = recordCommitment(db, {
        commitmentType: "agreement",
        occurredAt: now,
        summary: "Another promise",
        significance: 5,
        participants: participants(tobiasContact.id),
        now,
      });
      resolveCommitment(db, p.primary.id, resolution, {
        now,
        resolvingEvent: {
          type: "conversation",
          occurredAt: now,
          summary: "Resolution",
          participants: participants(tobiasContact.id),
          significance: 5,
        },
      });
      assert.equal(
        listRadar(db, undefined, { now }).find(
          (r) => r.contactId === contacts[2]?.id,
        )?.recencyScore,
        before?.recencyScore,
      );
    }
    assert.equal(promises.length, 2);
    const cadenceBefore = db
      .prepare("SELECT cadence_days FROM links WHERE id = ?")
      .get(tobias.linkId)?.cadence_days;
    const future = recordEventToolHandler(db, {
      kind: "interaction",
      input: {
        type: "conversation",
        occurredAt: "+3d",
        summary: "Future call",
        significance: 5,
        participants: participants(tobiasContact.id),
        now,
      },
    });
    assert.ok(future.ok);
    assert.deepEqual(future.warnings, [
      {
        code: "future_event",
        message:
          "occurredAt is in the future; it will not count as contact until then",
      },
    ]);
    assert.equal(
      listRadar(db, undefined, { now }).find(
        (r) => r.contactId === contacts[2]?.id,
      )?.recencyScore,
      before?.recencyScore,
    );
    assert.equal(
      db
        .prepare(
          "SELECT last_meaningful_event_at FROM link_rollups WHERE link_id = ?",
        )
        .get(tobias.linkId)?.last_meaningful_event_at,
      Date.parse("2026-03-28T12:00Z"),
    );
    assert.equal(
      db
        .prepare("SELECT cadence_days FROM links WHERE id = ?")
        .get(tobias.linkId)?.cadence_days,
      cadenceBefore,
    );
    const later = future.data.primary.occurredAt + 12 * 3600000;
    assert.ok(
      (listRadar(db, undefined, { now: later }).find(
        (r) => r.contactId === contacts[2]?.id,
      )?.recencyScore ?? 0) > 0.9,
    );
    refreshLinkRollup(db, tobias.linkId, later);
    assert.equal(
      db
        .prepare(
          "SELECT last_meaningful_event_at FROM link_rollups WHERE link_id = ?",
        )
        .get(tobias.linkId)?.last_meaningful_event_at,
      future.data.primary.occurredAt,
    );
  } finally {
    db.close();
  }
});
