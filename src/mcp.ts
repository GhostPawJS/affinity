import type { AffinityDb } from "./database.ts";
import { affinityMcpOptions } from "./surface/affinity_mcp_options.ts";
import { openAffinityDb } from "./surface/open_affinity_db.ts";
import { resolveAffinityDbPath } from "./surface/resolve_affinity_db_path.ts";
import { createMcpServer } from "./surfaces/mcp_server.ts";

export { affinityMcpInstructions } from "./surface/affinity_mcp_instructions.ts";
export { serveAffinityMcp } from "./surface/serve_affinity_mcp.ts";
export type { McpServerOptions } from "./surfaces/mcp_server.ts";
export {
  createMcpServer,
  MCP_LATEST_PROTOCOL_VERSION,
  MCP_SUPPORTED_PROTOCOL_VERSIONS,
} from "./surfaces/mcp_server.ts";
export { serveMcpStdio } from "./surfaces/mcp_stdio.ts";
export type * from "./surfaces/surface_types.ts";

export function createAffinityMcpServer(
  options: { db?: AffinityDb; dbPath?: string } = {},
) {
  return createMcpServer(
    affinityMcpOptions(
      () =>
        options.db ??
        openAffinityDb(
          resolveAffinityDbPath(
            options.dbPath === undefined ? {} : { flag: options.dbPath },
          ),
        ),
    ),
  );
}
