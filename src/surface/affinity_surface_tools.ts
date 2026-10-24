import type { AffinityDb } from "../database.ts";
import type { SurfaceTool } from "../surfaces/surface_types.ts";
import { affinityTools } from "../tools/tool_registry.ts";

export const affinitySurfaceTools: readonly SurfaceTool<AffinityDb>[] =
  affinityTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    whenToUse: tool.whenToUse,
    ...(tool.whenNotToUse === undefined
      ? {}
      : { whenNotToUse: tool.whenNotToUse }),
    readOnly: tool.readOnly,
    sideEffects: tool.sideEffects,
    inputSchema: { ...tool.inputSchema, type: "object" },
    handler: tool.handler as SurfaceTool<AffinityDb>["handler"],
  }));
