import type { AffinityDb } from "../database.ts";
import type { ToolCliOptions } from "../surfaces/cli.ts";
import { affinityVersion } from "../version.ts";
import { affinitySurfaceTools } from "./affinity_surface_tools.ts";

export const affinityCliOptions: ToolCliOptions<AffinityDb> = {
  bin: "ghostpaw-affinity",
  version: affinityVersion,
  description: "Local relationship model and social CRM",
  tools: affinitySurfaceTools,
  openContext: async (options) => {
    const { openAffinityDb } = await import("./open_affinity_db.ts");
    const { resolveAffinityDbPath } = await import(
      "./resolve_affinity_db_path.ts"
    );
    return openAffinityDb(
      resolveAffinityDbPath(
        options.db === undefined ? {} : { flag: options.db },
      ),
    );
  },
  closeContext: (db) => db.close(),
  commands: {
    mcp: async (options) => {
      const { serveAffinityMcp } = await import("./serve_affinity_mcp.ts");
      await serveAffinityMcp(
        options.db === undefined ? {} : { dbPath: options.db },
      );
    },
    skill: async () => {
      const { renderSkillMarkdown } = await import(
        "../surfaces/skill_markdown.ts"
      );
      const { affinitySkillSpec } = await import("./affinity_skill_spec.ts");
      return renderSkillMarkdown(affinitySkillSpec);
    },
  },
};
