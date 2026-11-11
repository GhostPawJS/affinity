import type { AffinityDb } from "../database.ts";
import { serveMcpStdio } from "../surfaces/mcp_stdio.ts";
import { affinityOwnedMcpServer } from "./affinity_owned_mcp_server.ts";

export async function serveAffinityMcp(
  options: { db?: AffinityDb; dbPath?: string } = {},
): Promise<void> {
  await serveMcpStdio(affinityOwnedMcpServer(options));
}
