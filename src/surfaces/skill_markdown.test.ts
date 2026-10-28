import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type SkillMarkdownSpec,
  renderSkillMarkdown,
} from "./skill_markdown.ts";

const spec: SkillMarkdownSpec<null> = {
  name: "example",
  description: "Manage records. Use when maintaining records.",
  bin: "example",
  server: "example",
  about: "A record engine.",
  tools: [
    {
      name: "find",
      description: "Find records",
      whenToUse: "searching",
      whenNotToUse: "writing",
      readOnly: true,
      inputSchema: {
        type: "object",
        required: ["mode"],
        properties: { mode: { type: "string", enum: ["a", "b"] } },
      },
      handler: () => null,
    },
  ],
  workflows: [{ name: "search", description: "Search well" }],
  principles: ["Search first."],
};
test("skill output has deterministic frontmatter, CLI, MCP and references", () => {
  const result = renderSkillMarkdown({
    ...spec,
    metadata: { version: "1" },
    license: "MIT",
  });
  assert.equal(
    result,
    renderSkillMarkdown({
      ...spec,
      metadata: { version: "1" },
      license: "MIT",
    }),
  );
  assert.ok(result.startsWith("---\nname: example\ndescription: "));
  for (const expected of [
    "MCP:",
    "example call <tool>",
    "example skill search",
    "Read-only.",
    "| mode | string | yes | a, b.",
    "Search first.",
  ])
    assert.ok(result.includes(expected), expected);
});
test("reject invalid skill metadata", () => {
  for (const name of ["UPPER", "-bad", "a--b", "a".repeat(65)])
    assert.throws(() => renderSkillMarkdown({ ...spec, name }));
  for (const description of ["", "x".repeat(1025), "Missing usage"])
    assert.throws(() => renderSkillMarkdown({ ...spec, description }));
});

test("reference base changes only workflow link targets", () => {
  assert.equal(
    renderSkillMarkdown(spec, { referencesBase: "skills/example/references" }),
    renderSkillMarkdown(spec).replace(
      "(references/search.md)",
      "(skills/example/references/search.md)",
    ),
  );
});

test("without a cheat sheet the existing markdown is byte-identical", () => {
  assert.equal(
    renderSkillMarkdown({
      ...spec,
      tools: [],
      workflows: [],
      principles: [],
      packageName: "@example/tool",
    }),
    "---\nname: example\ndescription: \"Manage records. Use when maintaining records.\"\n---\n\n# example\n\nA record engine.\n\n## Calling tools\n\nMCP: connect to example, then call a tool by name with its JSON arguments.\n\nCLI: `example call <tool> '<JSON object>'` or `example <tool> --parameter value` (without a global install: `npx -y @example/tool <tool> ...`).\n\nInspect schemas with `example describe <tool>`. Use `--db <path>` to select a database.\n\n## Workflow guides\n\n\n## Principles\n\n",
  );
});
