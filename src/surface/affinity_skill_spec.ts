import { affinitySkills } from "../skills/skill_registry.ts";
import { affinitySoulTraits } from "../soul.ts";
import { affinityMcpInstructions } from "./affinity_mcp_instructions.ts";
import { affinitySurfaceTools } from "./affinity_surface_tools.ts";

export const affinitySkillSpec = {
  name: "affinity",
  description:
    "Search and maintain local contacts, identities, relationships, events, commitments, and recurring dates. Use when recording relationship evidence or reviewing a social CRM.",
  license: "MIT",
  compatibility: "Node.js 24 or newer. MCP stdio or ghostpaw-affinity CLI.",
  bin: "ghostpaw-affinity",
  packageName: "@ghostpaw/affinity",
  server: "ghostpaw-affinity",
  about: affinityMcpInstructions,
  tools: affinitySurfaceTools,
  workflows: affinitySkills,
  principles: affinitySoulTraits.map((trait) => trait.principle),
};
