import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { defineAffinitySkill } from "./skill_types.ts";

describe("skill_types", () => {
  it("defines and returns a typed skill literal", () => {
    const skill = defineAffinitySkill({
      name: "example-skill",
      description: "Example.",
      content: "# Example",
    });

    strictEqual(skill.name, "example-skill");
    strictEqual(skill.description, "Example.");
    strictEqual(skill.content, "# Example");
  });
});
