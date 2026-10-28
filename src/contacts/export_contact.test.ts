import assert from "node:assert/strict";
import { test } from "node:test";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import * as write from "../write.ts";
import { exportAffinity } from "./export_affinity.ts";
import { exportContact } from "./export_contact.ts";

test("contact and whole database exports include records, names, participants and ISO times", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const now = Date.parse("2026-10-27T12:00:00Z");
    const owner = write.createContact(db, {
      name: "Owner",
      kind: "human",
      bootstrapOwner: true,
      now,
    }).primary;
    const jana = write.createContact(db, {
      name: "Jana",
      kind: "human",
      now,
    }).primary;
    const company = write.createContact(db, {
      name: "Company",
      kind: "company",
      now,
    }).primary;
    write.addIdentity(db, jana.id, {
      type: "email",
      value: "jana@example.com",
      now,
    });
    write.setAttribute(
      db,
      { kind: "contact", id: jana.id },
      "tag:friend",
      null,
    );
    write.setStructuralTie(db, {
      fromContactId: jana.id,
      toContactId: company.id,
      kind: "works_at",
      now,
    });
    write.setStructuralTie(db, {
      fromContactId: company.id,
      toContactId: jana.id,
      kind: "member_of",
      now,
    });
    const commitment = write.recordCommitment(db, {
      commitmentType: "promise",
      summary: "Send notes",
      significance: 6,
      occurredAt: now,
      dueAt: now + 86400000,
      now,
      participants: [
        { contactId: owner.id, role: "actor" },
        { contactId: jana.id, role: "recipient" },
      ],
    }).primary;
    write.addDateAnchor(db, {
      target: { kind: "contact", contactId: jana.id },
      recurrenceKind: "birthday",
      anchorMonth: 11,
      anchorDay: 3,
      summary: "Birthday",
      significance: 4,
      now,
    });
    const socialLink = (
      db
        .prepare("SELECT id FROM links WHERE is_structural = 0 LIMIT 1")
        .get() as { id: number }
    ).id;
    const linkAnchor = write.addDateAnchor(db, {
      target: { kind: "link", linkId: socialLink },
      recurrenceKind: "anniversary",
      anchorMonth: 10,
      anchorDay: 27,
      summary: "First call",
      significance: 4,
      now,
    }).primary;
    const exported = exportContact(db, jana.id);
    assert.equal(exported.events.length, 1);
    assert.equal(
      exported.dates.filter((date) => date.id === linkAnchor.id).length,
      1,
    );
    assert.equal(exported.contact.name, "Jana");
    assert.equal(exported.contact.createdAt, now);
    assert.equal(exported.contact.createdAtIso, "2026-10-27T12:00:00.000Z");
    assert.equal(exported.identities[0]?.value, "jana@example.com");
    assert.equal(exported.attributes[0]?.name, "tag:friend");
    assert.equal(
      exported.links.filter(
        (link) =>
          link.fromContactName === "Company" ||
          link.toContactName === "Company",
      ).length,
      2,
    );
    assert.equal(
      (exported.events[0] as Record<string, unknown>)?.occurredAtIso,
      "2026-10-27T12:00:00.000Z",
    );
    assert.equal(exported.events[0]?.participants.length, 2);
    assert.equal(exported.commitments[0]?.eventId, commitment.id);
    assert.equal(exported.commitments[0]?.dueAtIso, "2026-10-28T12:00:00.000Z");
    assert.equal(exported.dates.length, 2);
    assert.deepEqual(JSON.parse(JSON.stringify(exported)), exported);
    db.prepare(
      "INSERT INTO events (type, occurred_at, summary, created_at, updated_at) VALUES ('observation', ?, 'Unassigned', ?, ?)",
    ).run(now, now, now);
    const all = exportAffinity(db);
    assert.equal(
      all.events.find((event) => event.summary === "Unassigned")?.occurredAtIso,
      "2026-10-27T12:00:00.000Z",
    );
    assert.equal(
      all.events.filter((event) => event.id === linkAnchor.id).length,
      1,
    );
    assert.equal(all.version, 1);
    assert.equal(all.contacts[0]?.contact.isOwner, true);
    assert.equal(all.contacts[1]?.contact.isOwner, false);
    assert.equal(
      all.events.filter((event) => event.id === commitment.id).length,
      1,
    );
    assert.ok(all.contacts[0]?.eventIds.includes(commitment.id));
    assert.ok(all.contacts[1]?.eventIds.includes(commitment.id));
    assert.equal("events" in (all.contacts[0] ?? {}), false);
    assert.equal(
      all.events.find((event) => event.id === commitment.id)?.participants[1]
        ?.contactId,
      jana.id,
    );
    assert.equal(all.contacts[1]?.dateIds.length, 2);
    assert.equal(all.contacts.length, 3);
    assert.equal(Date.parse(all.exportedAtIso), all.exportedAt);
    assert.throws(() => exportContact(db, 999), { code: "NOT_FOUND" });
  } finally {
    db.close();
  }
});
