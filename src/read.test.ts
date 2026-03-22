import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitializedAffinityDb } from "./lib/test-db.ts";
import * as read from "./read.ts";
import { createContact } from "./write_impl/create_contact.ts";
import { mergeContacts } from "./write_impl/merge_contacts.ts";

describe("read barrel", () => {
  it("exports all 18 read operations", () => {
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
