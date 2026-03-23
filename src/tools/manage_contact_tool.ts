import { createContact } from "../contacts/create_contact.ts";
import { reviseContact } from "../contacts/revise_contact.ts";
import { setContactLifecycle } from "../contacts/set_contact_lifecycle.ts";
import type { ContactLifecycleState } from "../contacts/types.ts";
import type { AffinityDb } from "../database.ts";
import type { ContactListItem } from "../lib/types/contact_list_item.ts";
import type { CreateContactInput } from "../lib/types/create_contact_input.ts";
import type { MutationReceipt } from "../lib/types/mutation_receipt.ts";
import type { ReviseContactPatch } from "../lib/types/revise_contact_patch.ts";
import type { SetContactLifecycleOptions } from "../lib/types/set_contact_lifecycle_options.ts";
import {
  booleanSchema,
  defineAffinityTool,
  enumSchema,
  integerSchema,
  literalSchema,
  objectSchema,
  oneOfSchema,
  stringSchema,
} from "./tool_metadata.ts";
import { type MutationToolData, mutationToolResult } from "./tool_mutation.ts";
import { manageContactToolName } from "./tool_names.ts";
import {
  type ContactLocator,
  resolveContactLocator,
  withToolHandling,
} from "./tool_resolvers.ts";
import type { ToolResult } from "./tool_types.ts";

export type ManageContactToolInput =
  | { action: "create"; input: CreateContactInput }
  | { action: "revise"; contact: ContactLocator; patch: ReviseContactPatch }
  | {
      action: "set_lifecycle";
      contact: ContactLocator;
      lifecycleState: ContactLifecycleState;
      options?: SetContactLifecycleOptions;
    };

export type ManageContactToolResult = ToolResult<
  MutationToolData<ContactListItem>
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
            "Contact identity locator.",
          ),
        },
        ["identity"],
      ),
    ],
    description,
  );
}

export function manageContactToolHandler(
  db: AffinityDb,
  input: ManageContactToolInput,
): ManageContactToolResult {
  return withToolHandling<MutationToolData<ContactListItem>>(() => {
    if (input.action === "create") {
      return mutationToolResult(
        "create",
        createContact(db, input.input),
        "contact",
      );
    }
    const contact = resolveContactLocator(db, input.contact, "contact");
    if (!contact.ok) {
      return contact.result;
    }
    if (input.action === "revise") {
      return mutationToolResult(
        "revise",
        reviseContact(db, contact.value.id, input.patch),
        "contact",
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
  ManageContactToolInput,
  ManageContactToolResult
>({
  name: manageContactToolName,
  description:
    "Create a contact, revise one contact's core fields, or change lifecycle state.",
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
  inputSchema: oneOfSchema(
    [
      objectSchema(
        {
          action: literalSchema("create"),
          input: objectSchema(
            {
              name: stringSchema("Contact name."),
              kind: enumSchema("Contact kind.", [
                "human",
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
            "New contact payload.",
          ),
        },
        ["action", "input"],
      ),
      objectSchema(
        {
          action: literalSchema("revise"),
          contact: contactLocatorSchema("Target contact."),
          patch: objectSchema(
            {
              name: stringSchema("Optional replacement name."),
            },
            [],
            "Allowed contact patch.",
          ),
        },
        ["action", "contact", "patch"],
      ),
      objectSchema(
        {
          action: literalSchema("set_lifecycle"),
          contact: contactLocatorSchema("Target contact."),
          lifecycleState: enumSchema("Target lifecycle state.", [
            "active",
            "dormant",
            "merged",
            "lost",
          ]),
          options: objectSchema(
            {
              now: integerSchema("Optional timestamp."),
            },
            [],
            "Optional lifecycle metadata.",
          ),
        },
        ["action", "contact", "lifecycleState"],
      ),
    ],
    "Manage contacts.",
  ),
  handler: manageContactToolHandler,
});
