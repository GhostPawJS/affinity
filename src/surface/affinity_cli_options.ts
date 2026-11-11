import { existsSync } from "node:fs";
import type { AffinityDb } from "../database.ts";
import { withTimeZone } from "../lib/time_zone.ts";
import type { ToolCliOptions } from "../surfaces/cli.ts";
import { affinityVersion } from "../version.ts";
import { affinityCliError } from "./affinity_cli_errors.ts";
import { affinitySurfaceTools } from "./affinity_surface_tools.ts";
import { cliVersion, cliVersionInfo } from "./cli_version.ts";
import { normalizeTimeInputs } from "./plain_dates.ts";
import { resolveAffinityDbPath } from "./resolve_affinity_db_path.ts";

export const affinityCliOptions: ToolCliOptions<AffinityDb> = {
  withTimeZone,
  reportCreation: true,
  beforeContext: (db, stderr, quiet) => {
    if (
      db === undefined &&
      !process.env.GHOSTPAW_AFFINITY_DB &&
      !quiet &&
      process.env.GHOSTPAW_QUIET !== "1"
    )
      stderr.write(`using default db ${resolveAffinityDbPath()}\n`);
  },
  preflight: async (tool, input, dbPath) => {
    const path = resolveAffinityDbPath(
      dbPath === undefined ? {} : { flag: dbPath },
    );
    const { openAffinityDb } = await import("./open_affinity_db.ts");
    if (
      tool.readOnly ||
      (tool.name === "manage_contact" &&
        (input as { action?: string }).action === "export")
    )
      return openAffinityDb(path, { readOnly: true });
    if (path === ":memory:" || existsSync(path)) return undefined;
    const { cliExitCode } = await import("../surfaces/cli_output.ts");
    const memory = await openAffinityDb(":memory:");
    try {
      const result = await tool.handler(
        memory,
        structuredClone(input) as Record<string, unknown>,
      );
      if (cliExitCode(result) !== 0) return memory;
    } catch (error) {
      memory.close();
      throw error;
    }
    memory.close();
    return undefined;
  },
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
    const db = await openAffinityDb(path, { stderr: options.stderr });
    if (created) (options.stderr ?? process.stderr).write(`created ${path}\n`);
    return db;
  },
  closeContext: (db) => db.close(),
  commands: {
    migrate: async (options) => {
      const db = await affinityCliOptions.openContext(options);
      db.close();
    },
    batch: async (args, options) => {
      const { runAffinityBatch } = await import("./affinity_batch.ts");
      return runAffinityBatch(args, options);
    },
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
