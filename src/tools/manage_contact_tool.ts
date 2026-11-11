import { deleteContact } from "../contacts/delete_contact.ts";
import { exportAffinity } from "../contacts/export_affinity.ts";
import { exportContact } from "../contacts/export_contact.ts";
import { migrateContactKind } from "../contacts/migrate_contact_kind.ts";
import { reviseContact } from "../contacts/revise_contact.ts";
import { setContactLifecycle } from "../contacts/set_contact_lifecycle.ts";
import type { ContactKind, ContactLifecycleState } from "../contacts/types.ts";
import type { AffinityDb } from "../database.ts";
import type { AddIdentityInput } from "../lib/types/add_identity_input.ts";
import type { ContactListItem } from "../lib/types/contact_list_item.ts";
import type { CreateContactInput } from "../lib/types/create_contact_input.ts";
import type { MutationReceipt } from "../lib/types/mutation_receipt.ts";
import type { ReviseContactPatch } from "../lib/types/revise_contact_patch.ts";
import type { SetContactLifecycleOptions } from "../lib/types/set_contact_lifecycle_options.ts";
import { createContactToolResult } from "./create_contact_tool_result.ts";
import { contactLocatorSchema } from "./locator_schema.ts";
import type { TimeInputs } from "./parse_time_input.ts";
import {
  arraySchema,
  booleanSchema,
  defineAffinityTool,
  enumSchema,
  integerSchema,
  objectSchema,
  stringSchema,
} from "./tool_metadata.ts";
import { type MutationToolData, mutationToolResult } from "./tool_mutation.ts";
import { manageContactToolName } from "./tool_names.ts";
import {
  type ContactLocator,
  resolveContactLocator,
  withToolHandling,
} from "./tool_resolvers.ts";
import { withToolTimeZone } from "./tool_time_zone.ts";
import { toolSuccess } from "./tool_types.ts";
import { toolFailure as invalidToolInput } from "./tool_types.ts";
import type { ToolResult } from "./tool_types.ts";
import { validateToolInput } from "./validate_tool_input.ts";

export type ManageContactToolInput =
  | { action: "migrate_kind"; contact: ContactLocator; kind: ContactKind }
  | { action: "export"; contact?: ContactLocator }
  | { action: "delete"; contact: ContactLocator; confirm?: boolean }
  | {
      action: "create";
      input: CreateContactInput & { identities?: AddIdentityInput[] };
    }
  | { action: "revise"; contact: ContactLocator; patch: ReviseContactPatch }
  | {
      action: "set_lifecycle";
      contact: ContactLocator;
      lifecycleState: ContactLifecycleState;
      options?: SetContactLifecycleOptions;
    };

export type ManageContactToolResult = ToolResult<
  | MutationToolData<ContactListItem>
  | {
      action: "export";
      export:
        | ReturnType<typeof exportContact>
        | ReturnType<typeof exportAffinity>;
    }
  | {
      action: "delete";
      deletion: ReturnType<typeof deleteContact>;
      changes: { entity: string; id: number; action: string }[];
    }
>;

export function manageContactToolHandler(
  db: AffinityDb,
  input: TimeInputs<
    Exclude<ManageContactToolInput, { action: "export" | "delete" }>
  >,
): ToolResult<MutationToolData<ContactListItem>>;
export function manageContactToolHandler(
  db: AffinityDb,
  input: TimeInputs<ManageContactToolInput>,
): ManageContactToolResult;
export function manageContactToolHandler(
  db: AffinityDb,
  rawInput: TimeInputs<ManageContactToolInput>,
): ManageContactToolResult {
  return withToolTimeZone(rawInput, () =>
    manageContactToolHandlerInZone(db, rawInput),
  );
}

function manageContactToolHandlerInZone(
  db: AffinityDb,
  rawInput: TimeInputs<ManageContactToolInput>,
): ManageContactToolResult {
  const input = structuredClone(rawInput) as ManageContactToolInput;
  const inputError = validateToolInput(manageContactTool.inputSchema, input);
  if (inputError)
    return invalidToolInput(
      "protocol",
      "invalid_input",
      "Invalid input.",
      inputError,
      {
        details: {
          validKeys: Object.keys(
            manageContactTool.inputSchema.properties?.patch?.properties ?? {},
          ),
        },
      },
    );
  return withToolHandling<
    Extract<ManageContactToolResult, { ok: true }>["data"]
  >(() => {
    if (input.action === "export") {
      if (!input.contact)
        return toolSuccess("Exported Affinity.", {
          action: "export",
          export: exportAffinity(db),
        });
      const target = resolveContactLocator(db, input.contact, "contact", true);
      if (!target.ok) return target.result;
      return toolSuccess("Exported contact.", {
        action: "export",
        export: exportContact(db, target.value.id),
      });
    }
    if (input.action === "delete" && input.confirm !== true)
      return invalidToolInput(
        "protocol",
        "invalid_input",
        "Delete requires confirmation.",
        "delete is permanent; pass confirm: true (CLI: --confirm)",
      );
    if (input.action === "create") {
      if (!input.input)
        return invalidToolInput(
          "protocol",
          "invalid_input",
          "Missing input.",
          "input is required for create.",
        );
      return createContactToolResult(db, input.input);
    }
    const contact = resolveContactLocator(
      db,
      input.contact,
      "contact",
      input.action === "delete",
    );
    if (!contact.ok) {
      return contact.result;
    }
    if (input.action === "delete") {
      if (contact.value.is_owner)
        return invalidToolInput(
          "domain",
          "conflict",
          "Cannot delete owner.",
          "The owner contact cannot be deleted",
        );
      const deletion = deleteContact(db, contact.value.id, { confirm: true });
      return toolSuccess("Permanently deleted contact.", {
        action: "delete",
        deletion,
        changes: deletion.removed.flatMap((item) =>
          item.ids.map((id) => ({
            entity: item.entity,
            id,
            action: "removed",
          })),
        ),
      });
    }
    if (input.action === "migrate_kind") {
      return mutationToolResult(
        "migrate_kind",
        migrateContactKind(db, contact.value.id, input.kind),
        "contact",
        ["kind"],
      );
    }
    if (input.action === "revise") {
      return mutationToolResult(
        "revise",
        reviseContact(db, contact.value.id, input.patch),
        "contact",
        Object.keys(input.patch),
      );
    }
    return mutationToolResult(
      "set_lifecycle",
      setContactLifecycle(
        db,
        contact.value.id,
        input.lifecycleState,
        input.options,
      ),
      "contact",
    );
  }, "Contact tool failed.");
}

export const manageContactTool = defineAffinityTool<
  TimeInputs<ManageContactToolInput>,
  ManageContactToolResult
>({
  name: manageContactToolName,
  description:
    "Create, revise, export or permanently delete a contact (confirm: true required; owner cannot be deleted). Export without contact exports the whole database. Lifecycle lost is soft delete. ALWAYS search_affinity first before creating — duplicates corrupt the graph.",
  whenToUse:
    "Use this for contact creation and lifecycle-safe contact maintenance.",
  whenNotToUse: "Do not use this for identities, links, attributes, or merges.",
  sideEffects: "writes_state",
  readOnly: false,
  supportsClarification: true,
  targetKinds: ["contact"],
  inputDescriptions: {
    action: "Which contact action to perform.",
    input: "Creation payload for a new contact.",
    contact: "Target contact locator for revise or lifecycle actions.",
    patch: "Allowed contact patch fields.",
    lifecycleState: "The next lifecycle state to set.",
    options: "Optional lifecycle metadata such as now and provenance.",
  },
  outputDescription:
    "Returns the primary contact plus the mutation receipt fields needed to understand what changed.",
  inputSchema: objectSchema(
    {
      action: enumSchema("Operation to perform.", [
        "create",
        "revise",
        "migrate_kind",
        "set_lifecycle",
        "export",
        "delete",
      ]),
      input: objectSchema(
        {
          identities: arraySchema(
            objectSchema(
              {
                type: stringSchema("Identity type."),
                value: stringSchema("Identity value."),
                label: stringSchema("Optional label."),
                verified: booleanSchema("Verified identity."),
                now: integerSchema("Optional timestamp."),
              },
              ["type", "value"],
            ),
            "Optional identities to attach. An identity owned by another live contact causes a conflict, or returns that contact when ifExists=return.",
          ),
          ifExists: enumSchema(
            "Identity collision policy; return attaches nothing.",
            ["error", "return"],
          ),
          doNotContact: booleanSchema(
            "Block outbound engagement unless explicitly overridden.",
          ),
          name: stringSchema("Contact name."),
          kind: enumSchema("Contact kind.", [
            "human",
            "agent",
            "group",
            "company",
            "team",
            "pet",
            "service",
            "other",
          ]),
          now: integerSchema("Optional timestamp."),
          bootstrapOwner: booleanSchema(
            "Whether this contact should be the owner.",
          ),
        },
        ["name", "kind"],
        "New contact payload. Required when action=create.",
      ),
      kind: enumSchema(
        "Replacement contact kind for migrate_kind. Owner must remain human or agent. Audited without bond mechanics.",
        [
          "human",
          "agent",
          "group",
          "company",
          "team",
          "pet",
          "service",
          "other",
        ],
      ),
      confirm: booleanSchema("Required true for permanent deletion."),
      contact: contactLocatorSchema(
        "Target contact. Required when action=revise or set_lifecycle. Provide contactId or identity.",
      ),
      patch: objectSchema(
        {
          name: stringSchema("Optional replacement name."),
          doNotContact: booleanSchema(
            "Block outbound engagement unless explicitly overridden.",
          ),
        },
        [],
        "Allowed contact patch. Required when action=revise.",
      ),
      lifecycleState: enumSchema(
        "Target lifecycle state. Required when action=set_lifecycle.",
        ["active", "dormant", "merged", "lost"],
      ),
      options: objectSchema(
        {
          now: integerSchema("Optional timestamp."),
        },
        [],
        "Optional lifecycle metadata.",
      ),
    },
    ["action"],
    "Manage contacts.",
  ),
  handler: manageContactToolHandler,
});
