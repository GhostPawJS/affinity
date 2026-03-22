import { strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { AffinityMergeError } from "../lib/errors/affinity_merge_error.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { mergeContacts } from "./merge_contacts.ts";

describe("mergeContacts", () => {
  it("marks loser merged and records lineage", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: w } = createContact(db, { name: "Win", kind: "human" });
    const { primary: l } = createContact(db, { name: "Lose", kind: "human" });
    const r = mergeContacts(db, {
      winnerContactId: w.id,
      loserContactId: l.id,
      reasonSummary: " dup ",
    });
    strictEqual(r.primary.winnerContactId, w.id);
    strictEqual(r.primary.loserContactId, l.id);
    strictEqual(r.updated.length, 2);
    const loser = db
      .prepare(
        "SELECT lifecycle_state, merged_into_contact_id FROM contacts WHERE id = ?",
      )
      .get(l.id) as { lifecycle_state: string; merged_into_contact_id: number };
    strictEqual(loser.lifecycle_state, "merged");
    strictEqual(loser.merged_into_contact_id, w.id);
    const row = db
      .prepare(
        "SELECT reason_summary FROM contact_merges WHERE loser_contact_id = ?",
      )
      .get(l.id) as { reason_summary: string };
    strictEqual(row.reason_summary, "dup");
    const winnerRollup = db
      .prepare("SELECT warning_count FROM contact_rollups WHERE contact_id = ?")
      .get(w.id) as { warning_count: number };
    strictEqual(typeof winnerRollup.warning_count, "number");
    db.close();
  });

  it("throws on self-merge", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    throws(
      () => mergeContacts(db, { winnerContactId: c.id, loserContactId: c.id }),
      (e: unknown) => e instanceof AffinityMergeError,
    );
    db.close();
  });

  it("throws when loser already merged", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: w } = createContact(db, { name: "W", kind: "human" });
    const { primary: l } = createContact(db, { name: "L", kind: "human" });
    mergeContacts(db, { winnerContactId: w.id, loserContactId: l.id });
    throws(
      () => mergeContacts(db, { winnerContactId: w.id, loserContactId: l.id }),
      (e: unknown) => e instanceof AffinityMergeError,
    );
    db.close();
  });

  it("moves owner flag to winner when loser was owner", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Owner",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: other } = createContact(db, {
      name: "Other",
      kind: "human",
    });
    mergeContacts(db, { winnerContactId: other.id, loserContactId: owner.id });
    const wRow = db
      .prepare("SELECT is_owner FROM contacts WHERE id = ?")
      .get(other.id) as { is_owner: number };
    strictEqual(wRow.is_owner, 1);
    db.close();
  });

  it("dedupes event participants when both contacts attended", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: w } = createContact(db, { name: "W", kind: "human" });
    const { primary: l } = createContact(db, { name: "L", kind: "human" });
    const ins = db
      .prepare(
        `INSERT INTO events (type, occurred_at, summary, significance, created_at, updated_at)
       VALUES ('conversation', 1, 's', 0, 1, 1)`,
      )
      .run();
    const eventId = Number(ins.lastInsertRowid);
    db.prepare(
      `INSERT INTO event_participants (event_id, contact_id, role) VALUES (?, ?, 'actor')`,
    ).run(eventId, w.id);
    db.prepare(
      `INSERT INTO event_participants (event_id, contact_id, role) VALUES (?, ?, 'observer')`,
    ).run(eventId, l.id);
    mergeContacts(db, { winnerContactId: w.id, loserContactId: l.id });
    const n = db
      .prepare(
        "SELECT COUNT(*) AS c FROM event_participants WHERE event_id = ? AND contact_id = ?",
      )
      .get(eventId, w.id) as { c: number };
    strictEqual(Number(n.c), 1);
    db.close();
  });

  it("dedupes structural links after remap", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: w } = createContact(db, { name: "W", kind: "human" });
    const { primary: l } = createContact(db, { name: "L", kind: "human" });
    const { primary: c } = createContact(db, { name: "C", kind: "human" });
    const now = 99;
    db.prepare(
      `INSERT INTO links (
         from_contact_id, to_contact_id, kind, role, is_structural,
         created_at, updated_at
       ) VALUES (?, ?, 'works_at', NULL, 1, ?, ?)`,
    ).run(l.id, c.id, now, now);
    db.prepare(
      `INSERT INTO links (
         from_contact_id, to_contact_id, kind, role, is_structural,
         created_at, updated_at
       ) VALUES (?, ?, 'works_at', NULL, 1, ?, ?)`,
    ).run(w.id, c.id, now, now);
    mergeContacts(db, { winnerContactId: w.id, loserContactId: l.id });
    const live = db
      .prepare(
        `SELECT COUNT(*) AS c FROM links
         WHERE from_contact_id = ? AND to_contact_id = ? AND removed_at IS NULL`,
      )
      .get(w.id, c.id) as { c: number };
    strictEqual(Number(live.c), 1);
    db.close();
  });
});
