import type { AffinityDb } from "../database.ts";
import { addIdentity } from "../identities/add_identity.ts";
import { removeIdentity } from "../identities/remove_identity.ts";
import { reviseIdentity } from "../identities/revise_identity.ts";
import { verifyIdentity } from "../identities/verify_identity.ts";
import type { AddIdentityInput } from "../lib/types/add_identity_input.ts";
import type { IdentityRecord } from "../lib/types/identity_record.ts";
import type { ReviseIdentityPatch } from "../lib/types/revise_identity_patch.ts";
import {
  booleanSchema,
  defineAffinityTool,
  enumSchema,
  integerSchema,
  objectSchema,
  stringSchema,
} from "./tool_metadata.ts";
import { type MutationToolData, mutationToolResult } from "./tool_mutation.ts";
import { manageIdentityToolName } from "./tool_names.ts";
import {
  type ContactLocator,
  resolveContactLocator,
  withToolHandling,
} from "./tool_resolvers.ts";
import type { ToolResult } from "./tool_types.ts";

export type ManageIdentityToolInput =
  | { action: "add"; contact: ContactLocator; input: AddIdentityInput }
  | { action: "revise"; identityId: number; patch: ReviseIdentityPatch }
  | { action: "verify"; identityId: number; verifiedAt?: number }
  | { action: "remove"; identityId: number; removedAt?: number };

export type ManageIdentityToolResult = ToolResult<
  MutationToolData<IdentityRecord>
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

export function manageIdentityToolHandler(
  db: AffinityDb,
  input: ManageIdentityToolInput,
): ManageIdentityToolResult {
  return withToolHandling<MutationToolData<IdentityRecord>>(() => {
    switch (input.action) {
      case "add": {
        const contact = resolveContactLocator(db, input.contact, "contact");
        if (!contact.ok) {
          return contact.result;
        }
        return mutationToolResult(
          "add",
          addIdentity(db, contact.value.id, input.input),
          "identity",
        );
      }
      case "revise":
        return mutationToolResult(
          "revise",
          reviseIdentity(db, input.identityId, input.patch),
          "identity",
        );
      case "verify":
        return mutationToolResult(
          "verify",
          verifyIdentity(db, input.identityId, input.verifiedAt),
          "identity",
        );
      case "remove":
        return mutationToolResult(
          "remove",
          removeIdentity(db, input.identityId, input.removedAt),
          "identity",
        );
    }
  }, "Identity tool failed.");
}

export const manageIdentityTool = defineAffinityTool<
  ManageIdentityToolInput,
  ManageIdentityToolResult
>({
  name: manageIdentityToolName,
  description:
    "Add, revise, verify, or remove one routing identity on a contact. Use this for emails, phone numbers, social handles, and URLs — anything that could locate a person. Do not use manage_attribute for these.",
  whenToUse:
    "Use this for contact identity management such as email, handle, or phone routing keys.",
  whenNotToUse:
    "Do not use this for contact core fields, links, or attributes.",
  sideEffects: "writes_state",
  readOnly: false,
  supportsClarification: true,
  targetKinds: ["contact", "identity"],
  inputDescriptions: {
    action: "Which identity action to perform.",
    contact: "Target contact locator for identity creation.",
    input: "Creation payload for a new identity.",
    identityId: "Exact identity id for revise, verify, or remove actions.",
    patch: "Allowed identity patch fields.",
    verifiedAt: "Optional verification timestamp.",
    removedAt: "Optional removal timestamp.",
  },
  outputDescription:
    "Returns the primary identity plus the mutation receipt fields needed to understand what changed.",
  inputSchema: objectSchema(
    {
      action: enumSchema("Operation to perform.", [
        "add",
        "revise",
        "verify",
        "remove",
      ]),
      contact: contactLocatorSchema(
        "Target contact. Required when action=add. Provide contactId or identity.",
      ),
      input: objectSchema(
        {
          type: stringSchema("Identity type."),
          value: stringSchema("Identity value."),
          label: stringSchema("Optional label."),
          verified: booleanSchema("Whether the identity starts verified."),
          now: integerSchema("Optional timestamp."),
        },
        ["type", "value"],
        "New identity payload. Required when action=add.",
      ),
      identityId: integerSchema(
        "Identity id. Required when action=revise, verify, or remove.",
      ),
      patch: objectSchema(
        {
          type: stringSchema("Optional identity type."),
          value: stringSchema("Optional identity value."),
          label: stringSchema("Optional label."),
        },
        [],
        "Identity patch. Required when action=revise.",
      ),
      verifiedAt: integerSchema(
        "Verification timestamp. Optional for action=verify.",
      ),
      removedAt: integerSchema(
        "Removal timestamp. Optional for action=remove.",
      ),
    },
    ["action"],
    "Add, revise, verify, or remove one routing identity on a contact.",
  ),
  handler: manageIdentityToolHandler,
});
