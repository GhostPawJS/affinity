import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  affinitySkills,
  getAffinitySkillByName,
  listAffinitySkills,
} from "./index.ts";

const directApiNames = [
  "createContact",
  "reviseContact",
  "setContactLifecycle",
  "addIdentity",
  "reviseIdentity",
  "verifyIdentity",
  "removeIdentity",
  "setStructuralTie",
  "removeStructuralTie",
  "seedSocialLink",
  "overrideLinkState",
  "reviseBond",
  "recordInteraction",
  "recordObservation",
  "recordMilestone",
  "recordTransaction",
  "recordCommitment",
  "resolveCommitment",
  "addDateAnchor",
  "reviseDateAnchor",
  "removeDateAnchor",
  "setAttribute",
  "unsetAttribute",
  "replaceAttributes",
  "mergeContacts",
  "getOwnerProfile",
  "getContactProfile",
  "listContacts",
  "searchContacts",
  "getContactJournal",
  "getLinkTimeline",
  "listMoments",
  "getLinkDetail",
  "listOwnerSocialLinks",
  "listObservedLinks",
  "listProgressionReadiness",
  "listRadar",
  "listUpcomingDates",
  "listOpenCommitments",
  "getAffinityChart",
  "listDuplicateCandidates",
  "getMergeHistory",
];

const toolNames = [
  "search_affinity",
  "review_affinity",
  "inspect_affinity_item",
  "manage_contact",
  "merge_contacts",
  "manage_identity",
  "manage_relationship",
  "record_event",
  "manage_commitment",
  "manage_date_anchor",
  "manage_attribute",
];

describe("skill registry", () => {
  it("exports a complete runtime skill surface", () => {
    const names = affinitySkills.map((skill) => skill.name);
    const uniqueNames = new Set(names);
    const listed = listAffinitySkills();

    strictEqual(affinitySkills.length, 11);
    strictEqual(uniqueNames.size, affinitySkills.length);
    strictEqual(listed.length, affinitySkills.length);
    strictEqual(listed === affinitySkills, false);

    for (const skill of affinitySkills) {
      ok(skill.name.trim().length > 0);
      ok(skill.description.trim().length > 0);
      ok(skill.content.trim().length > 0);
      ok(
        toolNames.some((toolName) => skill.content.includes(`\`${toolName}\``)),
      );
      strictEqual(getAffinitySkillByName(skill.name), skill);

      for (const apiName of directApiNames) {
        strictEqual(
          skill.content.includes(`${apiName}(`),
          false,
          `${skill.name} should not teach direct API ${apiName}()`,
        );
      }
    }
  });
});
