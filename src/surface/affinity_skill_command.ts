import { CliUsageError } from "../surfaces/cli_args.ts";
import { suggestCommand } from "../surfaces/cli_output.ts";
import { renderSkillMarkdown } from "../surfaces/skill_markdown.ts";
import { affinitySkillReferences } from "./affinity_skill_references.ts";
import {
  affinityShortCheatSheet,
  affinitySkillSpec,
} from "./affinity_skill_spec.ts";

export function affinitySkillCommand(args: string[]): string {
  if (args.includes("--help") || args.includes("-h"))
    return "Usage: ghostpaw-affinity skill [<guide>|--short|--list|--help]\n";
  if (args.length > 1)
    throw new CliUsageError(
      "Usage: ghostpaw-affinity skill [<guide>|--short|--list|--help]",
    );
  const guide = args[0];
  if (guide === "--short")
    return `${affinityShortCheatSheet.replace(/^## CLI cheat sheet\n\n/, "")}\n`;
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
    `Unknown guide: ${guide}.${suggestion ? ` Did you mean ${suggestion}?` : ""} Usage: ghostpaw-affinity skill [<guide>|--short|--list|--help]`,
  );
}
