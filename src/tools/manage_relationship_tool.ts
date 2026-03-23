import type { AffinityDb } from "../database.ts";
import { overrideLinkState } from "../links/override_link_state.ts";
import { removeStructuralTie } from "../links/remove_structural_tie.ts";
import { reviseBond } from "../links/revise_bond.ts";
import { seedSocialLink } from "../links/seed_social_link.ts";
import { setStructuralTie } from "../links/set_structural_tie.ts";
import type { LinkListItem } from "../lib/types/link_list_item.ts";
import type { LinkMutationOptions } from "../lib/types/link_mutation_options.ts";
import type { SeedSocialLinkInput } from "../lib/types/seed_social_link_input.ts";
import type { SetStructuralTieInput } from "../lib/types/set_structural_tie_input.ts";
import type { LinkState } from "../links/types.ts";
import {
  booleanSchema,
  defineAffinityTool,
  enumSchema,
  integerSchema,
  literalSchema,
  nullableStringSchema,
  numberSchema,
  objectSchema,
  oneOfSchema,
  stringSchema,
} from "./tool_metadata.ts";
import { manageRelationshipToolName } from "./tool_names.ts";
import { mutationToolResult, type MutationToolData } from "./tool_mutation.ts";
import {
  resolveContactLocator,
  resolveLinkLocator,
  type ContactLocator,
  type LinkLocator,
  withToolHandling,
} from "./tool_resolvers.ts";
import type { ToolResult } from "./tool_types.ts";

export type ManageRelationshipToolInput =
  | {
      action: "seed_social_link";
      from: ContactLocator;
      to: ContactLocator;
      input: Omit<SeedSocialLinkInput, "fromContactId" | "toContactId">;
    }
  | {
      action: "revise_bond";
      link: LinkLocator;
      bond: string | null;
      options?: LinkMutationOptions;
    }
  | {
      action: "override_state";
      link: LinkLocator;
      state: LinkState;
      options?: LinkMutationOptions;
    }
  | {
      action: "set_structural_tie";
      from: ContactLocator;
      to: ContactLocator;
      input: Omit<SetStructuralTieInput, "fromContactId" | "toContactId">;
    }
  | {
      action: "remove_structural_tie";
      link: LinkLocator;
      removedAt?: number;
    };

export type ManageRelationshipToolResult = ToolResult<
  MutationToolData<LinkListItem>
>;

function contactLocatorSchema(description: string) {
  return oneOfSchema(
    [
      objectSchema(
        { contactId: integerSchema("Exact contact id.") },
        ["contactId"],
      ),
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

export function manageRelationshipToolHandler(
  db: AffinityDb,
  input: ManageRelationshipToolInput,
): ManageRelationshipToolResult {
  return withToolHandling<MutationToolData<LinkListItem>>(() => {
    switch (input.action) {
      case "seed_social_link": {
        const from = resolveContactLocator(db, input.from, "from");
        if (!from.ok) {
          return from.result;
        }
        const to = resolveContactLocator(db, input.to, "to");
        if (!to.ok) {
          return to.result;
        }
        return mutationToolResult(
          "seed_social_link",
          seedSocialLink(db, {
            ...input.input,
            fromContactId: from.value.id,
            toContactId: to.value.id,
          }),
          "relationship",
        );
      }
      case "revise_bond": {
        const link = resolveLinkLocator(db, input.link, "link");
        if (!link.ok) {
          return link.result;
        }
        return mutationToolResult(
          "revise_bond",
          reviseBond(db, link.value.id, input.bond, input.options),
          "relationship",
        );
      }
      case "override_state": {
        const link = resolveLinkLocator(db, input.link, "link");
        if (!link.ok) {
          return link.result;
        }
        return mutationToolResult(
          "override_state",
          overrideLinkState(db, link.value.id, input.state, input.options),
          "relationship",
        );
      }
      case "set_structural_tie": {
        const from = resolveContactLocator(db, input.from, "from");
        if (!from.ok) {
          return from.result;
        }
        const to = resolveContactLocator(db, input.to, "to");
        if (!to.ok) {
          return to.result;
        }
        return mutationToolResult(
          "set_structural_tie",
          setStructuralTie(db, {
            ...input.input,
            fromContactId: from.value.id,
            toContactId: to.value.id,
          }),
          "relationship",
        );
      }
      case "remove_structural_tie": {
        const link = resolveLinkLocator(db, input.link, "link");
        if (!link.ok) {
          return link.result;
        }
        return mutationToolResult(
          "remove_structural_tie",
          removeStructuralTie(db, link.value.id, input.removedAt),
          "relationship",
        );
      }
    }
  }, "Relationship tool failed.");
}

export const manageRelationshipTool = defineAffinityTool<
  ManageRelationshipToolInput,
  ManageRelationshipToolResult
>({
  name: manageRelationshipToolName,
  description:
    "Seed social links, revise bond and state, and manage structural ties.",
  whenToUse:
    "Use this for direct relationship modeling and link-state changes.",
  whenNotToUse:
    "Do not use this for recording social evidence or resolving commitments.",
  sideEffects: "writes_state",
  readOnly: false,
  supportsClarification: true,
  targetKinds: ["contact", "link"],
  inputDescriptions: {
    action: "Which relationship action to perform.",
    from: "Source contact locator for actions that create or set links.",
    to: "Destination contact locator for actions that create or set links.",
    input: "Action-specific creation payload.",
    link: "Target link locator for existing-link actions.",
    bond: "Replacement bond text or null.",
    state: "Replacement link state.",
    options: "Optional link mutation metadata such as now and provenance.",
    removedAt: "Optional structural-tie removal timestamp.",
  },
  outputDescription:
    "Returns the primary link plus the mutation receipt fields needed to understand what changed.",
  inputSchema: oneOfSchema(
    [
      objectSchema(
        {
          action: literalSchema("seed_social_link"),
          from: contactLocatorSchema("From contact."),
          to: contactLocatorSchema("To contact."),
          input: objectSchema(
            {
              kind: enumSchema("Relational link kind.", [
                "personal", "family", "professional", "romantic",
                "care", "service", "observed", "other_relational",
              ]),
              role: stringSchema("Optional role."),
              rank: integerSchema("Optional rank."),
              affinity: numberSchema("Optional affinity score 0–1."),
              trust: numberSchema("Optional trust score 0–1."),
              state: enumSchema("Optional initial state.", [
                "active", "dormant", "strained", "broken", "archived",
              ]),
              cadenceDays: integerSchema("Optional cadence days."),
              bond: stringSchema("Optional bond."),
              now: integerSchema("Optional timestamp."),
            },
            ["kind"],
          ),
        },
        ["action", "from", "to", "input"],
      ),
      objectSchema(
        {
          action: literalSchema("revise_bond"),
          link: linkLocatorSchema("Target link."),
          bond: nullableStringSchema("Replacement bond text, or null to clear."),
          options: objectSchema(
            { now: integerSchema("Optional timestamp.") },
            [],
          ),
        },
        ["action", "link", "bond"],
      ),
      objectSchema(
        {
          action: literalSchema("override_state"),
          link: linkLocatorSchema("Target link."),
          state: enumSchema("Replacement link state.", [
            "active", "dormant", "strained", "broken", "archived",
          ]),
          options: objectSchema(
            { now: integerSchema("Optional timestamp.") },
            [],
          ),
        },
        ["action", "link", "state"],
      ),
      objectSchema(
        {
          action: literalSchema("set_structural_tie"),
          from: contactLocatorSchema("From contact."),
          to: contactLocatorSchema("To contact."),
          input: objectSchema(
            {
              kind: enumSchema("Structural link kind.", [
                "works_at", "manages", "member_of", "married_to",
                "partner_of", "parent_of", "child_of", "sibling_of",
                "friend_of", "client_of", "vendor_of", "reports_to",
                "belongs_to", "other_structural",
              ]),
              role: stringSchema("Optional role."),
              now: integerSchema("Optional timestamp."),
            },
            ["kind"],
          ),
        },
        ["action", "from", "to", "input"],
      ),
      objectSchema(
        {
          action: literalSchema("remove_structural_tie"),
          link: linkLocatorSchema("Target structural tie."),
          removedAt: integerSchema("Optional removal timestamp."),
        },
        ["action", "link"],
      ),
    ],
    "Manage relationships.",
  ),
  handler: manageRelationshipToolHandler,
});
