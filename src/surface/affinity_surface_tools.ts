import type { AffinityDb } from "../database.ts";
import { CliUsageError } from "../surfaces/cli_args.ts";
import type { SurfaceTool } from "../surfaces/surface_types.ts";
import { affinityTools } from "../tools/tool_registry.ts";
import { toolFailure } from "../tools/tool_types.ts";
import { normalizeTimeInputs } from "./plain_dates.ts";
import { timestampSchema } from "./timestamp_schema.ts";

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
    inputSchema: {
      ...timestampSchema({ ...tool.inputSchema, type: "object" }),
      type: "object",
    },
    handler: (db, input) => {
      try {
        return tool.handler(db, normalizeTimeInputs(input) as never);
      } catch (error) {
        if (error instanceof CliUsageError)
          return toolFailure(
            "protocol",
            "invalid_input",
            "Invalid input.",
            error.message,
          );
        throw error;
      }
    },
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
    inputSchema: {
      ...affinityTools.find((original) => original.name === tool.name)
        ?.inputSchema,
      type: "object",
    },
    ...(mapping[tool.name] ? { cli: mapping[tool.name] } : {}),
  }));

export {
  affinitySurfaceTools as affinityMcpSurfaceTools,
  affinityCliSurfaceTools as affinitySurfaceTools,
};
