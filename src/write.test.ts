import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import * as write from "./write.ts";

describe("write barrel", () => {
  it("exports contact, identity, link, journal, attribute, and merge mutations", () => {
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
    strictEqual(typeof write.rebuildUpcomingOccurrences, "function");
    strictEqual(typeof write.setAttribute, "function");
    strictEqual(typeof write.unsetAttribute, "function");
    strictEqual(typeof write.replaceAttributes, "function");
    strictEqual(typeof write.mergeContacts, "function");
  });
});
