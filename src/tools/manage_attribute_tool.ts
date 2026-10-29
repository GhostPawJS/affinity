import { replaceAttributes } from "../attributes/replace_attributes.ts";
import { setAttribute } from "../attributes/set_attribute.ts";
import { unsetAttribute } from "../attributes/unset_attribute.ts";
import type { AffinityDb } from "../database.ts";
import { getEventByExternalRef } from "../events/event_metadata.ts";
import type { AttributeEntry } from "../lib/types/attribute_entry.ts";
import type { AttributeRecord } from "../lib/types/attribute_record.ts";
import type { AttributeTarget } from "../lib/types/attribute_target.ts";
import type { ExternalRef } from "../lib/types/social_event_input.ts";
import { externalRefSchema } from "./event_metadata_schema.ts";
import type { TimeInputs } from "./parse_time_input.ts";
import {
  arraySchema,
  defineAffinityTool,
  enumSchema,
  integerSchema,
  nullableStringSchema,
  objectSchema,
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
import { toolFailure as invalidToolInput } from "./tool_types.ts";
import type {
  ToolFailure,
  ToolNeedsClarification,
  ToolResult,
} from "./tool_types.ts";
import { validateToolInput } from "./validate_tool_input.ts";

type AttributeTargetInput =
  | { kind: "contact"; contact: ContactLocator }
  | { kind: "link"; link: LinkLocator }
  | { kind: "event"; eventId: number; ref?: never }
  | { kind: "event"; ref: ExternalRef; eventId?: never };

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
  return {
    type: "object" as const,
    properties: {
      contactId: integerSchema("Exact contact id."),
      identity: objectSchema(
        {
          type: stringSchema("Identity type."),
          value: stringSchema("Identity value."),
        },
        ["type", "value"],
        "Contact identity locator.",
      ),
    },
    description,
  };
}

function linkLocatorSchema(description: string) {
  return {
    type: "object" as const,
    properties: {
      linkId: integerSchema("Exact link id."),
      endpoints: objectSchema(
        {
          fromContactId: integerSchema("From contact id."),
          toContactId: integerSchema("To contact id."),
        },
        ["fromContactId", "toContactId"],
        "Endpoint-based link locator.",
      ),
    },
    description,
  };
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
  if (target.kind === "event") {
    if ((target.eventId === undefined) === (target.ref === undefined))
      return {
        kind: "error",
        result: invalidToolInput(
          "protocol",
          "invalid_input",
          "Invalid event target.",
          "Provide exactly one of target.eventId or target.ref.",
        ),
      };
    const eventId =
      target.eventId ??
      (target.ref &&
        getEventByExternalRef(db, target.ref.source, target.ref.id)?.id);
    if (eventId === undefined)
      return {
        kind: "error",
        result: invalidToolInput(
          "domain",
          "not_found",
          "Event not found.",
          "No event matches target.ref.",
        ),
      };
    return { kind: "ok", target: { kind: "event", eventId } };
  }
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
  rawInput: TimeInputs<ManageAttributeToolInput>,
): ManageAttributeToolResult {
  const input = structuredClone(rawInput) as ManageAttributeToolInput;
  const inputError = validateToolInput(manageAttributeTool.inputSchema, input);
  if (inputError)
    return invalidToolInput(
      "protocol",
      "invalid_input",
      "Invalid input.",
      inputError,
    );
  if (!input.target)
    return invalidToolInput(
      "protocol",
      "invalid_input",
      "Missing target.",
      "target is required.",
    );
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
  TimeInputs<ManageAttributeToolInput>,
  ManageAttributeToolResult
>({
  name: manageAttributeToolName,
  description:
    "Set, unset, or replace custom metadata attributes on contacts, links and events. For emails, phones, handles, and URLs use manage_identity instead — those are routing keys, not attributes.",
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
  inputSchema: objectSchema(
    {
      action: enumSchema("Operation to perform.", ["set", "unset", "replace"]),
      target: objectSchema(
        {
          kind: enumSchema("Target kind.", ["contact", "link", "event"]),
          eventId: integerSchema("Target event id; provide eventId or ref."),
          ref: externalRefSchema,
          contact: contactLocatorSchema(
            "Contact locator. Required when kind=contact. Provide contactId or identity.",
          ),
          link: linkLocatorSchema(
            "Link locator. Required when kind=link. Provide linkId or endpoints.",
          ),
        },
        ["kind"],
        "Attribute target. Always required.",
      ),
      name: stringSchema("Attribute name. Required when action=set or unset."),
      value: nullableStringSchema(
        "Attribute value. Required when action=set. Null for presence/tag semantics.",
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
        "Key-value map to replace all attributes. Required when action=replace.",
      ),
      removedAt: integerSchema("Removal timestamp. Optional for action=unset."),
    },
    ["action"],
    "Set, unset, or replace attributes on contacts, links and events.",
  ),
  handler: manageAttributeToolHandler,
});
