import { existsSync } from "node:fs";
import type { AffinityDb } from "../database.ts";
import type { ToolCliOptions } from "../surfaces/cli.ts";
import { affinityVersion } from "../version.ts";
import { affinityCliError } from "./affinity_cli_errors.ts";
import { affinitySurfaceTools } from "./affinity_surface_tools.ts";
import { cliVersion, cliVersionInfo } from "./cli_version.ts";
import { normalizeTimeInputs } from "./plain_dates.ts";
import { resolveAffinityDbPath } from "./resolve_affinity_db_path.ts";

export const affinityCliOptions: ToolCliOptions<AffinityDb> = {
  reportCreation: true,
  versionInfo: () => cliVersionInfo(affinityVersion),
  contextError: (db, tool, input) => {
    const readOnly =
      tool.readOnly ||
      (tool.name === "manage_contact" &&
        (input as { action?: string }).action === "export");
    const path = resolveAffinityDbPath(db === undefined ? {} : { flag: db });
    return readOnly && path !== ":memory:" && !existsSync(path)
      ? `Database not found: ${path} (it is created by the first write)`
      : undefined;
  },
  transformInput: normalizeTimeInputs,
  versionLine: () => cliVersion(affinityVersion),
  describeDb: (db) =>
    resolveAffinityDbPath(db === undefined ? {} : { flag: db }),
  formatError: affinityCliError,
  bin: "ghostpaw-affinity",
  version: affinityVersion,
  description: "Local relationship model and social CRM",
  tools: affinitySurfaceTools,
  openContext: async (options) => {
    const { openAffinityDb } = await import("./open_affinity_db.ts");
    const path = resolveAffinityDbPath(
      options.db === undefined ? {} : { flag: options.db },
    );
    const created = path !== ":memory:" && !existsSync(path);
    const db = await openAffinityDb(path);
    if (created) (options.stderr ?? process.stderr).write(`created ${path}\n`);
    return db;
  },
  closeContext: (db) => db.close(),
  commands: {
    mcp: async (options) => {
      const { serveAffinityMcp } = await import("./serve_affinity_mcp.ts");
      await serveAffinityMcp(
        options.db === undefined ? {} : { dbPath: options.db },
      );
    },
    skill: async (args = []) => {
      const { affinitySkillCommand } = await import(
        "./affinity_skill_command.ts"
      );
      return affinitySkillCommand(args);
    },
  },
};
