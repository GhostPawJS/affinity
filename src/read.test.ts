import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "./contacts/create_contact.ts";
import { createInitializedAffinityDb } from "./lib/testing/create_initialized_affinity_db.ts";
import { dismissDuplicate } from "./merges/dismiss_duplicate.ts";
import { mergeContacts } from "./merges/merge_contacts.ts";
import * as read from "./read.ts";

describe("read barrel", () => {
  it("exports all 18 documented read operations", () => {
    strictEqual(typeof read.getOwnerProfile, "function");
    strictEqual(typeof read.getContactProfile, "function");
    strictEqual(typeof read.listContacts, "function");
    strictEqual(typeof read.searchContacts, "function");
    strictEqual(typeof read.getContactJournal, "function");
    strictEqual(typeof read.getLinkTimeline, "function");
    strictEqual(typeof read.listMoments, "function");
    strictEqual(typeof read.getLinkDetail, "function");
    strictEqual(typeof read.listOwnerSocialLinks, "function");
    strictEqual(typeof read.listObservedLinks, "function");
    strictEqual(typeof read.listProgressionReadiness, "function");
    strictEqual(typeof read.listRadar, "function");
    strictEqual(typeof read.listUpcomingDates, "function");
    strictEqual(typeof read.listOpenCommitments, "function");
    strictEqual(typeof read.getAffinityChart, "function");
    strictEqual(typeof read.listDuplicateCandidates, "function");
    strictEqual(typeof read.getMergeHistory, "function");
    strictEqual(typeof read.listDismissedDuplicates, "function");
  });
});

describe("getMergeHistory", () => {
  it("returns merge rows for winner or loser", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: w } = createContact(db, { name: "W", kind: "human" });
    const { primary: l } = createContact(db, { name: "L", kind: "human" });
    mergeContacts(db, { winnerContactId: w.id, loserContactId: l.id });
    const fromW = read.getMergeHistory(db, w.id);
    const fromL = read.getMergeHistory(db, l.id);
    strictEqual(fromW.length, 1);
    strictEqual(fromL.length, 1);
    strictEqual(fromW[0]?.winnerContactId, w.id);
    db.close();
  });
});

describe("listDismissedDuplicates", () => {
  it("round-trips a dismissal", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "Sarah", kind: "human" });
    const { primary: b } = createContact(db, { name: "Sarah", kind: "human" });

    strictEqual(read.listDismissedDuplicates(db).length, 0);
    dismissDuplicate(db, a.id, b.id, "confirmed different");
    const records = read.listDismissedDuplicates(db);
    strictEqual(records.length, 1);
    strictEqual(records[0]?.reason, "confirmed different");

    db.close();
  });
});

describe("listContacts", () => {
  it("excludes merged contacts by default", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: w } = createContact(db, { name: "W", kind: "human" });
    const { primary: l } = createContact(db, { name: "L", kind: "human" });
    mergeContacts(db, { winnerContactId: w.id, loserContactId: l.id });
    const all = read.listContacts(db);
    strictEqual(
      all.some((c) => c.id === l.id),
      false,
    );
    db.close();
  });
});
