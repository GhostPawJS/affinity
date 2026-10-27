import { CliUsageError } from "../surfaces/cli_args.ts";
import { suggestCommand } from "../surfaces/cli_output.ts";
import { renderSkillMarkdown } from "../surfaces/skill_markdown.ts";
import { affinitySkillReferences } from "./affinity_skill_references.ts";
import { affinitySkillSpec } from "./affinity_skill_spec.ts";

export function affinitySkillCommand(args: string[]): string {
  if (args.includes("--help") || args.includes("-h"))
    return "Usage: ghostpaw-affinity skill [<guide>|--list|--help]\n";
  if (args.length > 1) throw new CliUsageError("Expected one skill guide");
  const guide = args[0];
  if (guide === "--list")
    return `${Object.entries(affinitySkillReferences)
      .map(([name, entry]) => `${name}\t${entry.description}`)
      .join("\n")}\n`;
  if (!guide) return renderSkillMarkdown(affinitySkillSpec);
  const found = affinitySkillReferences[guide];
  if (found) return found.content;
  const suggestion = suggestCommand(
    guide,
    Object.keys(affinitySkillReferences),
  );
  throw new CliUsageError(
    `Unknown guide: ${guide}.${suggestion ? ` Did you mean ${suggestion}?` : ""}`,
  );
}
