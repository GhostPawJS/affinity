import { replaceAttributes } from "../attributes/replace_attributes.ts";
import { setAttribute } from "../attributes/set_attribute.ts";
import { unsetAttribute } from "../attributes/unset_attribute.ts";
import type { AffinityDb } from "../database.ts";
import type { AttributeEntry } from "../lib/types/attribute_entry.ts";
import type { AttributeRecord } from "../lib/types/attribute_record.ts";
import type { AttributeTarget } from "../lib/types/attribute_target.ts";
import {
  arraySchema,
  booleanSchema,
  defineAffinityTool,
  integerSchema,
  literalSchema,
  nullableStringSchema,
  objectSchema,
  oneOfSchema,
  stringSchema,
} from "./tool_metadata.ts";
import { type MutationToolData, mutationToolResult } from "./tool_mutation.ts";
import { manageAttributeToolName } from "./tool_names.ts";
import {
  type ContactLocator,
  type LinkLocator,
  resolveContactLocator,
  resolveLinkLocator,
  withToolHandling,
} from "./tool_resolvers.ts";
import type {
  ToolFailure,
  ToolNeedsClarification,
  ToolResult,
} from "./tool_types.ts";

type AttributeTargetInput =
  | { kind: "contact"; contact: ContactLocator }
  | { kind: "link"; link: LinkLocator };

export type ManageAttributeToolInput =
  | {
      action: "set";
      target: AttributeTargetInput;
      name: string;
      value: string | null;
    }
  | {
      action: "unset";
      target: AttributeTargetInput;
      name: string;
      removedAt?: number;
    }
  | {
      action: "replace";
      target: AttributeTargetInput;
      entries: AttributeEntry[];
    };

export type ManageAttributeToolResult = ToolResult<
  MutationToolData<AttributeRecord>
>;

function contactLocatorSchema(description: string) {
  return oneOfSchema(
    [
      objectSchema({ contactId: integerSchema("Exact contact id.") }, [
        "contactId",
      ]),
      objectSchema(
        {
          identity: objectSchema(
            {
              type: stringSchema("Identity type."),
              value: stringSchema("Identity value."),
            },
            ["type", "value"],
          ),
        },
        ["identity"],
      ),
    ],
    description,
  );
}

function linkLocatorSchema(description: string) {
  return oneOfSchema(
    [
      objectSchema({ linkId: integerSchema("Exact link id.") }, ["linkId"]),
      objectSchema(
        {
          endpoints: objectSchema(
            {
              fromContactId: integerSchema("From contact id."),
              toContactId: integerSchema("To contact id."),
              kind: stringSchema("Optional link kind."),
              role: stringSchema("Optional link role."),
              isStructural: booleanSchema("Optional structural discriminator."),
            },
            ["fromContactId", "toContactId"],
          ),
        },
        ["endpoints"],
      ),
    ],
    description,
  );
}

function resolveAttributeTarget(
  db: AffinityDb,
  target: AttributeTargetInput,
):
  | { kind: "ok"; target: AttributeTarget }
  | {
      kind: "error";
      result: ToolFailure | ToolNeedsClarification;
    } {
  if (target.kind === "contact") {
    const contact = resolveContactLocator(db, target.contact, "target.contact");
    if (!contact.ok) {
      return { kind: "error", result: contact.result };
    }
    return { kind: "ok", target: { kind: "contact", id: contact.value.id } };
  }
  const link = resolveLinkLocator(db, target.link, "target.link");
  if (!link.ok) {
    return { kind: "error", result: link.result };
  }
  return { kind: "ok", target: { kind: "link", id: link.value.id } };
}

export function manageAttributeToolHandler(
  db: AffinityDb,
  input: ManageAttributeToolInput,
): ManageAttributeToolResult {
  return withToolHandling<MutationToolData<AttributeRecord>>(() => {
    const resolved = resolveAttributeTarget(db, input.target);
    if (resolved.kind === "error") {
      return resolved.result;
    }
    switch (input.action) {
      case "set":
        return mutationToolResult(
          "set",
          setAttribute(db, resolved.target, input.name, input.value),
          "attribute",
        );
      case "unset":
        return mutationToolResult(
          "unset",
          unsetAttribute(db, resolved.target, input.name, input.removedAt),
          "attribute",
        );
      case "replace":
        return mutationToolResult(
          "replace",
          replaceAttributes(db, resolved.target, input.entries),
          "attribute",
        );
    }
  }, "Attribute tool failed.");
}

export const manageAttributeTool = defineAffinityTool<
  ManageAttributeToolInput,
  ManageAttributeToolResult
>({
  name: manageAttributeToolName,
  description: "Set, unset, or replace attributes on contacts and links.",
  whenToUse:
    "Use this for metadata such as tags, notes, or small labeled facts attached to a contact or link.",
  whenNotToUse:
    "Do not use this for core contact fields, identities, or direct relationship mechanics.",
  sideEffects: "writes_state",
  readOnly: false,
  supportsClarification: true,
  targetKinds: ["contact", "link", "attribute"],
  inputDescriptions: {
    action: "Which attribute action to perform.",
    target: "The contact or link that owns the attribute(s).",
    name: "Single attribute name for set or unset.",
    value: "Single attribute value; null means presence/tag semantics.",
    removedAt: "Optional unset timestamp.",
    entries: "Replacement attribute set for the target.",
  },
  outputDescription:
    "Returns the primary attribute plus the mutation receipt fields needed to understand what changed.",
  inputSchema: oneOfSchema(
    [
      objectSchema(
        {
          action: literalSchema("set"),
          target: oneOfSchema(
            [
              objectSchema(
                {
                  kind: literalSchema("contact"),
                  contact: contactLocatorSchema("Target contact."),
                },
                ["kind", "contact"],
              ),
              objectSchema(
                {
                  kind: literalSchema("link"),
                  link: linkLocatorSchema("Target link."),
                },
                ["kind", "link"],
              ),
            ],
            "Attribute target.",
          ),
          name: stringSchema("Attribute name."),
          value: nullableStringSchema(
            "Attribute value, or null for presence/tag semantics.",
          ),
        },
        ["action", "target", "name"],
      ),
      objectSchema(
        {
          action: literalSchema("unset"),
          target: oneOfSchema(
            [
              objectSchema(
                {
                  kind: literalSchema("contact"),
                  contact: contactLocatorSchema("Target contact."),
                },
                ["kind", "contact"],
              ),
              objectSchema(
                {
                  kind: literalSchema("link"),
                  link: linkLocatorSchema("Target link."),
                },
                ["kind", "link"],
              ),
            ],
            "Attribute target.",
          ),
          name: stringSchema("Attribute name."),
          removedAt: integerSchema("Optional removal timestamp."),
        },
        ["action", "target", "name"],
      ),
      objectSchema(
        {
          action: literalSchema("replace"),
          target: oneOfSchema(
            [
              objectSchema(
                {
                  kind: literalSchema("contact"),
                  contact: contactLocatorSchema("Target contact."),
                },
                ["kind", "contact"],
              ),
              objectSchema(
                {
                  kind: literalSchema("link"),
                  link: linkLocatorSchema("Target link."),
                },
                ["kind", "link"],
              ),
            ],
            "Attribute target.",
          ),
          entries: arraySchema(
            objectSchema(
              {
                name: stringSchema("Attribute name."),
                value: nullableStringSchema(
                  "Attribute value, or null for presence/tag semantics.",
                ),
              },
              ["name"],
            ),
            "Replacement attribute entries.",
          ),
        },
        ["action", "target", "entries"],
      ),
    ],
    "Manage attributes.",
  ),
  handler: manageAttributeToolHandler,
});
