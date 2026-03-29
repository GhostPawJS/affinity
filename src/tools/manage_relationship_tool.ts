import type { AffinityDb } from "../database.ts";
import type { LinkListItem } from "../lib/types/link_list_item.ts";
import type { LinkMutationOptions } from "../lib/types/link_mutation_options.ts";
import type { SeedSocialLinkInput } from "../lib/types/seed_social_link_input.ts";
import type { SetStructuralTieInput } from "../lib/types/set_structural_tie_input.ts";
import { overrideLinkState } from "../links/override_link_state.ts";
import { removeStructuralTie } from "../links/remove_structural_tie.ts";
import { reviseBond } from "../links/revise_bond.ts";
import { seedSocialLink } from "../links/seed_social_link.ts";
import { setStructuralTie } from "../links/set_structural_tie.ts";
import type { LinkState } from "../links/types.ts";
import {
  booleanSchema,
  defineAffinityTool,
  enumSchema,
  integerSchema,
  nullableStringSchema,
  objectSchema,
  stringSchema,
} from "./tool_metadata.ts";
import { type MutationToolData, mutationToolResult } from "./tool_mutation.ts";
import { manageRelationshipToolName } from "./tool_names.ts";
import {
  type ContactLocator,
  type LinkLocator,
  resolveContactLocator,
  resolveLinkLocator,
  withToolHandling,
} from "./tool_resolvers.ts";
import type { ToolResult } from "./tool_types.ts";

export type ManageRelationshipToolInput =
  | {
      action: "seed_social_link";
      from: ContactLocator;
      to: ContactLocator;
      input?: Omit<SeedSocialLinkInput, "fromContactId" | "toContactId">;
      kind?: string;
      role?: string;
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
      input?: Omit<SetStructuralTieInput, "fromContactId" | "toContactId">;
      kind?: string;
      role?: string;
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
          kind: stringSchema("Optional link kind."),
          role: stringSchema("Optional link role."),
          isStructural: booleanSchema("Optional structural discriminator."),
        },
        ["fromContactId", "toContactId"],
        "Endpoint-based link locator.",
      ),
    },
    description,
  };
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
        const merged = {
          ...input.input,
          ...(input.kind !== undefined && input.input?.kind === undefined
            ? { kind: input.kind }
            : {}),
          ...(input.role !== undefined && input.input?.role === undefined
            ? { role: input.role }
            : {}),
        } as Omit<SeedSocialLinkInput, "fromContactId" | "toContactId">;
        return mutationToolResult(
          "seed_social_link",
          seedSocialLink(db, {
            ...merged,
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
        const merged = {
          ...input.input,
          ...(input.kind !== undefined && input.input?.kind === undefined
            ? { kind: input.kind }
            : {}),
          ...(input.role !== undefined && input.input?.role === undefined
            ? { role: input.role }
            : {}),
        } as Omit<SetStructuralTieInput, "fromContactId" | "toContactId">;
        return mutationToolResult(
          "set_structural_tie",
          setStructuralTie(db, {
            ...merged,
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
    "Seed social links, revise bond and state, and manage structural ties. Seed a link as soon as a relationship is mentioned — do not wait for repeated evidence.",
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
    input:
      "Action-specific creation payload (alternative to top-level kind/role).",
    kind: "Link kind for seed_social_link or set_structural_tie. Can be passed here or inside input.",
    role: "Optional role for seed_social_link or set_structural_tie. Can be passed here or inside input.",
    link: "Target link locator for existing-link actions.",
    bond: "Replacement bond text or null.",
    state: "Replacement link state.",
    options: "Optional link mutation metadata such as now and provenance.",
    removedAt: "Optional structural-tie removal timestamp.",
  },
  outputDescription:
    "Returns the primary link plus the mutation receipt fields needed to understand what changed.",
  inputSchema: objectSchema(
    {
      action: enumSchema("Operation to perform.", [
        "seed_social_link",
        "revise_bond",
        "override_state",
        "set_structural_tie",
        "remove_structural_tie",
      ]),
      from: contactLocatorSchema(
        "Source contact. Required when action=seed_social_link or set_structural_tie. Provide contactId or identity.",
      ),
      to: contactLocatorSchema(
        "Target contact. Required when action=seed_social_link or set_structural_tie. Provide contactId or identity.",
      ),
      kind: stringSchema(
        "Link kind. Required for seed_social_link and set_structural_tie. Can be passed here or inside input. For seed_social_link: personal, family, professional, romantic, care, service, observed, other_relational. For set_structural_tie: works_at, manages, member_of, married_to, partner_of, parent_of, child_of, sibling_of, friend_of, client_of, vendor_of, reports_to, belongs_to, other_structural.",
      ),
      role: stringSchema(
        "Optional role for seed_social_link or set_structural_tie. Can be passed here or inside input.",
      ),
      input: {
        type: "object" as const,
        description:
          "Full payload for seed_social_link or set_structural_tie. Alternative to top-level kind/role.",
      },
      link: linkLocatorSchema(
        "Target link. Required when action=revise_bond, override_state, or remove_structural_tie. Provide linkId or endpoints.",
      ),
      bond: nullableStringSchema(
        "Bond text. Required when action=revise_bond. Null to clear.",
      ),
      state: enumSchema("Link state. Required when action=override_state.", [
        "active",
        "dormant",
        "strained",
        "broken",
        "archived",
      ]),
      options: objectSchema(
        { now: integerSchema("Optional timestamp.") },
        [],
        "Optional metadata.",
      ),
      removedAt: integerSchema(
        "Removal timestamp. Optional for action=remove_structural_tie.",
      ),
    },
    ["action"],
    "Seed social links, revise bond and state, and manage structural ties.",
  ),
  handler: manageRelationshipToolHandler,
});
