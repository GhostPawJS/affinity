import type { AffinityDb } from "../database.ts";
import type { SurfaceTool } from "../surfaces/surface_types.ts";
import { affinityTools } from "../tools/tool_registry.ts";

const affinitySurfaceTools: readonly SurfaceTool<AffinityDb>[] =
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

const mapping: Record<string, NonNullable<SurfaceTool<AffinityDb>["cli"]>> = {
  search_affinity: { verb: "search", positionals: ["query"] },
  review_affinity: { verb: "review", positionals: ["view"] },
  inspect_affinity_item: { verb: "show", positionals: ["kind"] },
  manage_contact: {
    noun: "contact",
    verb: "manage",
    action: {
      property: "action",
      verbs: { set_lifecycle: "lifecycle" },
      positionals: {
        create: ["input"],
        revise: ["contact"],
        set_lifecycle: ["contact", "lifecycleState"],
      },
    },
  },
  merge_contacts: { noun: "contact", verb: "merge" },
  manage_duplicate_dismissal: { noun: "duplicate", verb: "manage" },
  manage_identity: {
    noun: "identity",
    verb: "manage",
    action: {
      property: "action",
      positionals: {
        revise: ["identityId"],
        verify: ["identityId"],
        remove: ["identityId"],
      },
    },
  },
  manage_relationship: {
    noun: "relationship",
    verb: "manage",
    action: {
      property: "action",
      verbs: {
        seed_social_link: "add",
        revise_bond: "bond",
        override_state: "state",
        set_structural_tie: "tie",
        remove_structural_tie: "untie",
      },
    },
  },
  record_event: { noun: "event", verb: "record" },
  manage_commitment: { noun: "commitment", verb: "manage" },
  manage_date_anchor: {
    noun: "date",
    verb: "manage",
    action: {
      property: "action",
      positionals: { revise: ["anchorEventId"], remove: ["anchorEventId"] },
    },
  },
  manage_attribute: { noun: "attribute", verb: "manage" },
};
const affinityCliSurfaceTools: readonly SurfaceTool<AffinityDb>[] =
  /* @__PURE__ */ affinitySurfaceTools.map((tool) => ({
    ...tool,
    ...(mapping[tool.name] ? { cli: mapping[tool.name] } : {}),
  }));

export {
  affinitySurfaceTools as affinityMcpSurfaceTools,
  affinityCliSurfaceTools as affinitySurfaceTools,
};
