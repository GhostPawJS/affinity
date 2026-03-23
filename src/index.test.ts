import { strictEqual } from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { initAffinityTables, read, skills, soul, types, write } from "./index.ts";

describe("package entry", () => {
  it("exports only the documented package surface", () => {
    strictEqual(typeof initAffinityTables, "function");
    strictEqual(typeof types, "object");
    strictEqual(typeof soul, "object");
    strictEqual(typeof soul.affinitySoul, "object");
    strictEqual(typeof soul.renderAffinitySoulPromptFoundation, "function");
    strictEqual(typeof skills, "object");
    strictEqual(typeof skills.listAffinitySkills, "function");
    strictEqual(typeof skills.getAffinitySkillByName, "function");
    strictEqual(typeof write.createContact, "function");
    strictEqual(typeof write.reviseContact, "function");
    strictEqual(typeof write.setContactLifecycle, "function");
    strictEqual(typeof write.addIdentity, "function");
    strictEqual(typeof write.reviseIdentity, "function");
    strictEqual(typeof write.verifyIdentity, "function");
    strictEqual(typeof write.removeIdentity, "function");
    strictEqual(typeof write.setStructuralTie, "function");
    strictEqual(typeof write.removeStructuralTie, "function");
    strictEqual(typeof write.seedSocialLink, "function");
    strictEqual(typeof write.overrideLinkState, "function");
    strictEqual(typeof write.reviseBond, "function");
    strictEqual(typeof write.recordInteraction, "function");
    strictEqual(typeof write.recordObservation, "function");
    strictEqual(typeof write.recordMilestone, "function");
    strictEqual(typeof write.recordTransaction, "function");
    strictEqual(typeof write.recordCommitment, "function");
    strictEqual(typeof write.resolveCommitment, "function");
    strictEqual(typeof write.addDateAnchor, "function");
    strictEqual(typeof write.reviseDateAnchor, "function");
    strictEqual(typeof write.removeDateAnchor, "function");
    strictEqual(typeof write.setAttribute, "function");
    strictEqual(typeof write.unsetAttribute, "function");
    strictEqual(typeof write.replaceAttributes, "function");
    strictEqual(typeof write.mergeContacts, "function");
    strictEqual(typeof read.getOwnerProfile, "function");
    strictEqual(typeof read.listContacts, "function");
    strictEqual(typeof read.getMergeHistory, "function");
  });

  it("initializes schema on a DatabaseSync instance", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    initAffinityTables(db);
    const row = db
      .prepare(
        `SELECT COUNT(*) AS total
         FROM sqlite_master
         WHERE type = 'table'
           AND name IN (
             'contacts',
             'identities',
             'links',
             'events',
             'event_participants',
             'attributes'
           )`,
      )
      .get() as { total?: number };
    strictEqual(Number(row?.total ?? 0), 6);
    db.close();
  });
});
