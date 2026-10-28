import type { AffinityDb } from "../database.ts";
import { CliUsageError } from "../surfaces/cli_args.ts";
import type { SurfaceTool } from "../surfaces/surface_types.ts";
import { affinityTools } from "../tools/tool_registry.ts";
import { toolFailure } from "../tools/tool_types.ts";
import { cliActionFields } from "./cli_action_fields.ts";
import { normalizeTimeInputs } from "./plain_dates.ts";
import { timestampSchema } from "./timestamp_schema.ts";

function surfaceProperties(tool: {
  name: string;
  inputSchema: {
    properties?:
      | Readonly<Record<string, import("../tools/tool_metadata.ts").JsonSchema>>
      | undefined;
  };
}) {
  return {
    ...tool.inputSchema.properties,
    ...(["inspect_affinity_item", "review_affinity", "manage_event"].includes(
      tool.name,
    )
      ? {
          refSource: {
            type: "string" as const,
            description: "External reference source.",
          },
          refId: {
            type: "string" as const,
            description: "External reference id.",
          },
        }
      : {}),
    ...(tool.name === "review_affinity"
      ? {
          withContent: {
            type: "boolean" as const,
            description: "Include verbatim event content.",
          },
        }
      : {}),
  };
}
const affinitySurfaceTools: readonly SurfaceTool<AffinityDb>[] =
  affinityTools.map((tool) => ({
    name: tool.name,
    description: tool.description,

    readOnly: tool.readOnly,
    sideEffects: tool.sideEffects,
    inputSchema: {
      ...timestampSchema({
        ...tool.inputSchema,
        properties: surfaceProperties(tool),
        type: "object",
      }),
      type: "object",
    },
    handler: (db, input) => {
      try {
        const { withContent, refSource, refId, ...normalized } = input;
        if (withContent !== undefined) normalized.includeContent = withContent;
        if (refSource !== undefined || refId !== undefined) {
          if (normalized.ref !== undefined)
            return toolFailure(
              "protocol",
              "invalid_input",
              "Invalid target.",
              "Provide ref or ref-source/ref-id, not both.",
            );
          normalized.ref = { source: refSource, id: refId };
        }
        return tool.handler(db, normalizeTimeInputs(normalized) as never);
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
      fields: {
        create: ["input"],
        revise: ["contact", "patch"],
        set_lifecycle: ["contact", "lifecycleState", "options"],
        export: ["contact"],
        delete: ["contact", "confirm"],
      },
      required: {
        create: ["input"],
        revise: ["contact", "patch"],
        set_lifecycle: ["contact", "lifecycleState"],
        delete: ["contact", "confirm"],
      },
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
  manage_event: {
    noun: "event",
    verb: "manage",
    action: {
      property: "action",
      fields: {
        revise: ["eventId", "ref", "refSource", "refId", "patch"],
        delete: ["eventId", "ref", "refSource", "refId", "confirm"],
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
  /* @__PURE__ */ affinitySurfaceTools.map((tool) => {
    const cli = mapping[tool.name];
    const fields = cliActionFields[tool.name];
    return {
      ...tool,
      inputSchema: {
        ...affinityTools.find((original) => original.name === tool.name)
          ?.inputSchema,
        type: "object",
        properties: surfaceProperties({
          name: tool.name,
          inputSchema:
            affinityTools.find((original) => original.name === tool.name)
              ?.inputSchema ?? {},
        }),
      },
      ...(cli
        ? {
            cli: {
              ...cli,
              ...(fields
                ? {
                    action: {
                      property: "action",
                      ...cli.action,
                      fields,
                    },
                  }
                : {}),
            },
          }
        : {}),
    };
  });

export {
  affinitySurfaceTools as affinityMcpSurfaceTools,
  affinityCliSurfaceTools as affinitySurfaceTools,
};
