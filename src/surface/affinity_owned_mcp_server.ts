import type { AffinityDb } from "../database.ts";
import { createMcpServer } from "../surfaces/mcp_server.ts";
import { schemaUpgradeHint } from "./affinity_cli_errors.ts";
import { affinityMcpOptions } from "./affinity_mcp_options.ts";
import { affinityMcpSurfaceTools } from "./affinity_surface_tools.ts";
import { openAffinityDb } from "./open_affinity_db.ts";
import { readOnlyTool } from "./read_only_tool.ts";
import { resolveAffinityDbPath } from "./resolve_affinity_db_path.ts";

export function affinityOwnedMcpServer(options: {
  db?: AffinityDb;
  dbPath?: string;
}) {
  const path = resolveAffinityDbPath(
    options.dbPath === undefined ? {} : { flag: options.dbPath },
  );
  return createMcpServer({
    ...affinityMcpOptions(() => options.db as AffinityDb),
    tools: affinityMcpSurfaceTools.map((tool) => ({
      ...tool,
      handler: async (_context, input) => {
        const db =
          options.db ??
          (await openAffinityDb(path, {
            readOnly: readOnlyTool(tool, input),
          }));
        try {
          const result = await tool.handler(db, input);
          if (result && typeof result === "object" && "error" in result) {
            const error = result.error as { message: string };
            error.message = schemaUpgradeHint(error.message);
          }
          return result;
        } finally {
          if (!options.db) db.close();
        }
      },
    })),
  });
}
