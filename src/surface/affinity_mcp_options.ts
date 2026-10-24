import type { AffinityDb } from "../database.ts";
import type { McpServerOptions } from "../surfaces/mcp_server.ts";
import { affinityVersion } from "../version.ts";
import { affinityMcpInstructions } from "./affinity_mcp_instructions.ts";
import { affinitySurfaceTools } from "./affinity_surface_tools.ts";

export function affinityMcpOptions(
  context: () => AffinityDb | Promise<AffinityDb>,
): McpServerOptions<AffinityDb> {
  return {
    name: "ghostpaw-affinity",
    version: affinityVersion,
    title: "Affinity",
    instructions: affinityMcpInstructions,
    tools: affinitySurfaceTools,
    context,
    annotations: (tool) => ({
      readOnlyHint: tool.readOnly ?? false,
      destructiveHint:
        tool.name === "merge_contacts" ||
        /remove|unset|undismiss/.test(
          JSON.stringify(tool.inputSchema.properties?.action?.enum ?? []),
        ),
      idempotentHint: tool.readOnly ?? false,
      openWorldHint: false,
    }),
  };
}
