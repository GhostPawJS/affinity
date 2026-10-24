import type { AffinityDb } from "../database.ts";
import { createMcpServer } from "../surfaces/mcp_server.ts";
import { serveMcpStdio } from "../surfaces/mcp_stdio.ts";
import { affinityMcpOptions } from "./affinity_mcp_options.ts";
import { openAffinityDb } from "./open_affinity_db.ts";
import { resolveAffinityDbPath } from "./resolve_affinity_db_path.ts";

export async function serveAffinityMcp(
  options: { db?: AffinityDb; dbPath?: string } = {},
): Promise<void> {
  let owned: AffinityDb | undefined;
  const server = createMcpServer(
    affinityMcpOptions(async () => {
      if (options.db) return options.db;
      owned = await openAffinityDb(
        resolveAffinityDbPath(
          options.dbPath === undefined ? {} : { flag: options.dbPath },
        ),
      );
      return owned;
    }),
  );
  try {
    await serveMcpStdio(server);
  } finally {
    owned?.close();
  }
}
