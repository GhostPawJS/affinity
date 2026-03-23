import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  affinitySkills,
  bootstrapAndColdStartSkill,
  getAffinitySkillByName,
  listAffinitySkills,
} from "./index.ts";

describe("skills barrel", () => {
  it("re-exports the runtime helpers and skill constants", () => {
    strictEqual(typeof bootstrapAndColdStartSkill.name, "string");
    strictEqual(getAffinitySkillByName("bootstrap-and-cold-start"), bootstrapAndColdStartSkill);
    strictEqual(listAffinitySkills().length, affinitySkills.length);
  });
});
