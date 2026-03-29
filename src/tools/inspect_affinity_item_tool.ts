import { getContactProfile } from "../contacts/get_contact_profile.ts";
import { getOwnerProfile } from "../contacts/get_owner_profile.ts";
import type { AffinityDb } from "../database.ts";
import type { ContactProfileRecord } from "../lib/types/contact_profile_record.ts";
import type { LinkDetailRecord } from "../lib/types/link_detail_record.ts";
import { getLinkDetail } from "../links/get_link_detail.ts";
import {
  defineAffinityTool,
  enumSchema,
  integerSchema,
  objectSchema,
  stringSchema,
} from "./tool_metadata.ts";
import { inspectAffinityItemToolName } from "./tool_names.ts";
import { toContactEntityRef, toLinkEntityRef } from "./tool_ref.ts";
import {
  type ContactLocator,
  type LinkLocator,
  resolveContactLocator,
  resolveLinkLocator,
  withToolHandling,
} from "./tool_resolvers.ts";
import type { ToolResult } from "./tool_types.ts";
import { toolFailure, toolSuccess } from "./tool_types.ts";

export type InspectAffinityItemToolInput =
  | { kind: "owner_profile"; topLinksLimit?: number }
  | {
      kind: "contact_profile";
      contact: ContactLocator;
      topLinksLimit?: number;
    }
  | {
      kind: "link";
      link: LinkLocator;
      recentEventsLimit?: number;
    };

export type InspectAffinityItemToolData =
  | { kind: "owner_profile"; detail: ContactProfileRecord }
  | { kind: "contact_profile"; detail: ContactProfileRecord }
  | { kind: "link"; detail: LinkDetailRecord };

export type InspectAffinityItemToolResult =
  ToolResult<InspectAffinityItemToolData>;

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

export function inspectAffinityItemToolHandler(
  db: AffinityDb,
  input: InspectAffinityItemToolInput,
): InspectAffinityItemToolResult {
  return withToolHandling<InspectAffinityItemToolData>(() => {
    if (input.kind === "owner_profile") {
      const detail = getOwnerProfile(
        db,
        input.topLinksLimit === undefined
          ? undefined
          : { topLinksLimit: input.topLinksLimit },
      );
      if (!detail) {
        return toolFailure(
          "domain",
          "not_found",
          "Owner profile not found.",
          "No owner contact exists yet.",
        );
      }
      return toolSuccess(
        `Loaded owner profile for ${detail.contact.name}.`,
        { kind: input.kind, detail },
        { entities: [toContactEntityRef(detail.contact)] },
      );
    }

    if (input.kind === "contact_profile") {
      const contact = resolveContactLocator(db, input.contact, "contact");
      if (!contact.ok) {
        return contact.result;
      }
      const detail = getContactProfile(
        db,
        contact.value.id,
        input.topLinksLimit === undefined
          ? undefined
          : { topLinksLimit: input.topLinksLimit },
      );
      if (!detail) {
        return toolFailure(
          "domain",
          "not_found",
          "Contact profile not found.",
          "The target contact no longer has a readable profile.",
        );
      }
      return toolSuccess(
        `Loaded contact profile for ${detail.contact.name}.`,
        { kind: input.kind, detail },
        { entities: [toContactEntityRef(detail.contact)] },
      );
    }

    const link = resolveLinkLocator(db, input.link, "link");
    if (!link.ok) {
      return link.result;
    }
    const detail = getLinkDetail(
      db,
      link.value.id,
      input.recentEventsLimit === undefined
        ? undefined
        : { recentEventsLimit: input.recentEventsLimit },
    );
    if (!detail) {
      return toolFailure(
        "domain",
        "not_found",
        "Link detail not found.",
        "The target link no longer has a readable detail record.",
      );
    }
    return toolSuccess(
      `Loaded link detail for link #${detail.link.id}.`,
      { kind: input.kind, detail },
      {
        entities: [
          toLinkEntityRef(detail.link),
          toContactEntityRef(detail.counterparty),
        ],
      },
    );
  }, "Inspection failed.");
}

export const inspectAffinityItemTool = defineAffinityTool<
  InspectAffinityItemToolInput,
  InspectAffinityItemToolResult
>({
  name: inspectAffinityItemToolName,
  description:
    "Inspect one exact affinity item such as the owner profile, a contact profile, or one link detail.",
  whenToUse:
    "Use this when you already know the exact item you want to inspect in depth.",
  whenNotToUse:
    "Do not use this for search-style discovery or dashboard-like list reviews.",
  sideEffects: "none",
  readOnly: true,
  supportsClarification: true,
  targetKinds: ["contact", "link"],
  inputDescriptions: {
    kind: "Which exact item to inspect.",
    contact: "Contact locator for contact profile inspection.",
    link: "Link locator for link detail inspection.",
    topLinksLimit: "Optional top-links cap for profile views.",
    recentEventsLimit: "Optional recent-events cap for link detail.",
  },
  outputDescription:
    "Returns one shaped detail object and dense entity references for the inspected item.",
  inputSchema: objectSchema(
    {
      kind: enumSchema("What to inspect.", [
        "owner_profile",
        "contact_profile",
        "link",
      ]),
      contact: contactLocatorSchema(
        "Target contact. Required when kind=contact_profile. Provide contactId or identity.",
      ),
      link: linkLocatorSchema(
        "Target link. Required when kind=link. Provide linkId or endpoints.",
      ),
      topLinksLimit: integerSchema("Optional top-links cap."),
      recentEventsLimit: integerSchema("Optional recent-events cap."),
    },
    ["kind"],
    "Inspect one exact affinity item.",
  ),
  handler: inspectAffinityItemToolHandler,
});
