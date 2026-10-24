import { readFileSync } from "node:fs";
import { affinitySkills } from "../../src/skills/skill_registry.ts";
import { affinitySkillSpec } from "../../src/surface/affinity_skill_spec.ts";
import { affinitySurfaceTools } from "../../src/surface/affinity_surface_tools.ts";

const pkg = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
);
export const config = {
  slug: "affinity",
  skill: affinitySkillSpec,
  workflows: affinitySkills,
  manifest: {
    name: "ghostpaw-affinity",
    version: pkg.version,
    description:
      "Local relationship model and social CRM for contacts, relationships, evidence, and commitments.",
    author: pkg.author,
    homepage: pkg.homepage,
    repository: pkg.repository.url,
    license: pkg.license,
    keywords: pkg.keywords,
    server: "ghostpaw-affinity",
    packageName: pkg.name,
    mcpName: "io.github.GhostPawJS/affinity",
    title: "GhostPaw Affinity",
    websiteUrl: pkg.homepage,
    environment: [
      {
        name: "GHOSTPAW_AFFINITY_DB",
        description: "SQLite database path (default: ~/.ghostpaw/affinity.db)",
      },
    ],
  },
};

export const mcpbSpec = {
  ...config.manifest,
  longDescription:
    "Local relationship model and social CRM. Stores data in a local SQLite database.",
  documentation: "https://github.com/GhostPawJS/affinity/blob/main/README.md",
  support: pkg.bugs.url,
  entryPoint: "server/mcp-server.js",
  env: { GHOSTPAW_AFFINITY_DB: "${user_config.db_path}" },
  userConfig: {
    db_path: {
      type: "string",
      title: "Database path",
      description: "Path to the local SQLite database.",
      required: false,
      default: "${HOME}/.ghostpaw/affinity.db",
    },
  },
  tools: affinitySurfaceTools.map(({ name, description }) => ({
    name,
    description,
  })),
};
