import { affinitySurfaceTools } from "./surface/affinity_surface_tools.ts";
import { runToolCli } from "./surfaces/cli.ts";
import { affinityVersion } from "./version.ts";

process.exitCode = await runToolCli(process.argv.slice(2), {
  bin: "ghostpaw-affinity",
  version: affinityVersion,
  description: "Local relationship model and social CRM",
  tools: affinitySurfaceTools,
  openContext: async (options) => {
    const { openAffinityDb } = await import("./surface/open_affinity_db.ts");
    const { resolveAffinityDbPath } = await import(
      "./surface/resolve_affinity_db_path.ts"
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
      const { serveAffinityMcp } = await import(
        "./surface/serve_affinity_mcp.ts"
      );
      await serveAffinityMcp(
        options.db === undefined ? {} : { dbPath: options.db },
      );
    },
    skill: async () => {
      const { renderSkillMarkdown } = await import(
        "./surfaces/skill_markdown.ts"
      );
      const { affinitySkillSpec } = await import(
        "./surface/affinity_skill_spec.ts"
      );
      return renderSkillMarkdown(affinitySkillSpec);
    },
  },
});
