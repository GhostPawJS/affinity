import { listContacts } from "../contacts/list_contacts.ts";
import { listDuplicateCandidates } from "../contacts/list_duplicate_candidates.ts";
import type { ContactKind, ContactLifecycleState } from "../contacts/types.ts";
import type { AffinityDb } from "../database.ts";
import { listUpcomingDates } from "../dates/list_upcoming_dates.ts";
import { getContactJournal } from "../events/get_contact_journal.ts";
import { listMoments } from "../events/list_moments.ts";
import { listOpenCommitments } from "../events/list_open_commitments.ts";
import type {
  EventMomentKind,
  EventRecurrenceKind,
  EventType,
} from "../events/types.ts";
import { getAffinityChart } from "../graph/get_affinity_chart.ts";
import type { AffinityChartRecord } from "../lib/types/affinity_chart_record.ts";
import { getLinkTimeline } from "../links/get_link_timeline.ts";
import { listObservedLinks } from "../links/list_observed_links.ts";
import { listOwnerSocialLinks } from "../links/list_owner_social_links.ts";
import { listProgressionReadiness } from "../links/list_progression_readiness.ts";
import { listRadar } from "../links/list_radar.ts";
import type { LinkKind, LinkState } from "../links/types.ts";
import { getMergeHistory } from "../merges/get_merge_history.ts";
import {
  arraySchema,
  booleanSchema,
  defineAffinityTool,
  enumSchema,
  integerSchema,
  numberSchema,
  objectSchema,
  stringSchema,
} from "./tool_metadata.ts";
import { reviewAffinityToolName } from "./tool_names.ts";
import {
  toContactListToolItem,
  toEventListToolItem,
  toLinkListToolItem,
} from "./tool_ref.ts";
import {
  type ContactLocator,
  type LinkLocator,
  resolveContactLocator,
  resolveLinkLocator,
  withToolHandling,
} from "./tool_resolvers.ts";
import { summarizeCount } from "./tool_summary.ts";
import type { ToolListItem, ToolResult } from "./tool_types.ts";
import {
  toolFailure,
  toolNeedsClarification,
  toolSuccess,
  toolWarning,
} from "./tool_types.ts";

export type ReviewAffinityToolView =
  | "contacts.list"
  | "contacts.duplicates"
  | "events.contact_journal"
  | "events.link_timeline"
  | "events.moments"
  | "commitments.open"
  | "links.owner"
  | "links.observed"
  | "links.progression_readiness"
  | "links.radar"
  | "dates.upcoming"
  | "graph.chart"
  | "merges.history";

export interface ReviewAffinityToolInput {
  view: ReviewAffinityToolView;
  contact?: ContactLocator;
  link?: LinkLocator;
  contactIds?: number[];
  kind?: ContactKind | LinkKind;
  lifecycleState?: ContactLifecycleState;
  linkState?: LinkState;
  includeOwner?: boolean;
  includeDormant?: boolean;
  includeArchived?: boolean;
  includeObserved?: boolean;
  eventTypes?: EventType[];
  momentKind?: EventMomentKind;
  commitmentType?: "promise" | "agreement";
  recurrenceKind?: EventRecurrenceKind;
  horizonDays?: number;
  exactOnly?: boolean;
  minScore?: number;
  since?: number;
  until?: number;
  limit?: number;
  offset?: number;
}

export interface ReviewAffinityToolData {
  view: ReviewAffinityToolView;
  items: ToolListItem[];
  count: number;
  appliedFilters: Record<string, unknown>;
  chart?: AffinityChartRecord | undefined;
}

export type ReviewAffinityToolResult = ToolResult<ReviewAffinityToolData>;

function buildReadOptions(input: ReviewAffinityToolInput) {
  return {
    ...(input.limit === undefined ? {} : { limit: input.limit }),
    ...(input.offset === undefined ? {} : { offset: input.offset }),
    ...(input.includeArchived === undefined
      ? {}
      : { includeArchived: input.includeArchived }),
    ...(input.includeDormant === undefined
      ? {}
      : { includeDormant: input.includeDormant }),
    ...(input.includeObserved === undefined
      ? {}
      : { includeObserved: input.includeObserved }),
    ...(input.since === undefined ? {} : { since: input.since }),
    ...(input.until === undefined ? {} : { until: input.until }),
  };
}

function buildChartOptions(input: ReviewAffinityToolInput) {
  return {
    ...(input.includeArchived === undefined
      ? {}
      : { includeArchived: input.includeArchived }),
    ...(input.includeObserved === undefined
      ? {}
      : { includeObserved: input.includeObserved }),
    ...(input.contactIds === undefined ? {} : { contactIds: input.contactIds }),
  };
}

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

function validateReviewInput(
  input: ReviewAffinityToolInput,
): ReviewAffinityToolResult | null {
  if (
    input.view === "events.contact_journal" ||
    input.view === "events.moments" ||
    input.view === "commitments.open" ||
    input.view === "merges.history"
  ) {
    if (input.contact === undefined) {
      if (
        input.view === "events.moments" ||
        input.view === "commitments.open"
      ) {
        // Optional for these views.
      } else {
        return toolNeedsClarification(
          "missing_required_choice",
          "This review view needs a target contact.",
          ["contact"],
        );
      }
    }
  } else if (input.contact !== undefined) {
    return toolFailure(
      "protocol",
      "invalid_input",
      "A contact locator is not valid for this review view.",
      "Use `contact` only with contact-journal, moments, open-commitments, or merge-history review views.",
    );
  }

  if (
    input.view === "events.link_timeline" ||
    input.view === "events.moments" ||
    input.view === "commitments.open"
  ) {
    if (input.link === undefined) {
      if (
        input.view === "events.moments" ||
        input.view === "commitments.open"
      ) {
        // Optional for these views.
      } else {
        return toolNeedsClarification(
          "missing_required_choice",
          "This review view needs a target link.",
          ["link"],
        );
      }
    }
  } else if (input.link !== undefined) {
    return toolFailure(
      "protocol",
      "invalid_input",
      "A link locator is not valid for this review view.",
      "Use `link` only with link-timeline, moments, or open-commitments review views.",
    );
  }

  if (
    input.view === "events.contact_journal" ||
    input.view === "events.link_timeline"
  ) {
    if (input.eventTypes !== undefined && input.eventTypes.length === 0) {
      return toolNeedsClarification(
        "missing_required_choice",
        "If you provide `eventTypes`, include at least one event type.",
        ["eventTypes"],
      );
    }
  }

  if (
    input.contactIds !== undefined &&
    input.view !== "contacts.duplicates" &&
    input.view !== "graph.chart"
  ) {
    return toolFailure(
      "protocol",
      "invalid_input",
      "The `contactIds` filter is not valid for this review view.",
      "Use `contactIds` only with duplicate-candidate or chart review views.",
    );
  }

  return null;
}

function duplicateCandidateItem(candidate: {
  leftContactId: number;
  rightContactId: number;
  matchReason: string;
  matchScore: number;
}): ToolListItem {
  return {
    kind: "contact",
    id: candidate.leftContactId,
    title: `Possible duplicate: #${candidate.leftContactId} and #${candidate.rightContactId}`,
    subtitle: candidate.matchReason,
    snippet: `score ${candidate.matchScore.toFixed(2)}`,
  };
}

function momentItem(moment: {
  eventId: number;
  linkId: number;
  momentKind: string;
  summary: string;
  occurredAt: number;
}): ToolListItem {
  return {
    kind: "event",
    id: moment.eventId,
    title: moment.summary,
    subtitle: moment.momentKind,
    snippet: `link #${moment.linkId} at ${moment.occurredAt}`,
  };
}

function commitmentItem(commitment: {
  eventId: number;
  type: string;
  summary: string;
  dueAt?: number | null;
  resolutionState: string;
  participants: readonly unknown[];
}): ToolListItem {
  return {
    kind: "event",
    id: commitment.eventId,
    title: commitment.summary,
    subtitle: commitment.type,
    snippet: `state ${commitment.resolutionState}; participants ${commitment.participants.length}; due ${commitment.dueAt ?? "none"}`,
  };
}

function radarItem(radar: {
  linkId: number;
  contactId: number;
  recommendedReason: string;
  driftPriority: number;
}): ToolListItem {
  return {
    kind: "link",
    id: radar.linkId,
    title: `Link #${radar.linkId}`,
    subtitle: `contact #${radar.contactId}`,
    snippet: `${radar.recommendedReason} (${radar.driftPriority.toFixed(2)})`,
  };
}

function upcomingDateItem(date: {
  targetRef: { kind: "contact" | "link"; id: number };
  summary: string;
  recurrenceKind: string;
  occursOn: number;
}): ToolListItem {
  return {
    kind: date.targetRef.kind,
    id: date.targetRef.id,
    title: date.summary,
    subtitle: date.recurrenceKind,
    snippet: `occurs ${date.occursOn}`,
  };
}

function mergeHistoryItem(record: {
  winnerContactId: number;
  loserContactId: number;
  mergedAt: number;
  reasonSummary?: string | null;
}): ToolListItem {
  return {
    kind: "contact",
    id: record.winnerContactId,
    title: `Merged #${record.loserContactId} into #${record.winnerContactId}`,
    subtitle: `at ${record.mergedAt}`,
    snippet: record.reasonSummary ?? undefined,
  };
}

function compactFilters(
  input: ReviewAffinityToolInput,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) => key !== "view" && value !== undefined,
    ),
  );
}

export function reviewAffinityToolHandler(
  db: AffinityDb,
  input: ReviewAffinityToolInput,
): ReviewAffinityToolResult {
  return withToolHandling<ReviewAffinityToolData>(() => {
    const invalid = validateReviewInput(input);
    if (invalid) {
      return invalid;
    }

    const options = buildReadOptions(input);
    let items: ToolListItem[] = [];
    let chart: AffinityChartRecord | undefined;

    switch (input.view) {
      case "contacts.list":
        items = listContacts(
          db,
          {
            ...(input.kind === undefined
              ? {}
              : { kind: input.kind as ContactKind }),
            ...(input.lifecycleState === undefined
              ? {}
              : { lifecycleState: input.lifecycleState }),
            ...(input.includeOwner === undefined
              ? {}
              : { includeOwner: input.includeOwner }),
            ...(input.includeDormant === undefined
              ? {}
              : { includeDormant: input.includeDormant }),
          },
          options,
        ).map(toContactListToolItem);
        break;
      case "contacts.duplicates":
        items = listDuplicateCandidates(
          db,
          {
            ...(input.contactIds === undefined
              ? {}
              : { contactIds: input.contactIds }),
            ...(input.exactOnly === undefined
              ? {}
              : { exactOnly: input.exactOnly }),
            ...(input.minScore === undefined
              ? {}
              : { minScore: input.minScore }),
          },
          options,
        ).map(duplicateCandidateItem);
        break;
      case "events.contact_journal": {
        const locator = input.contact;
        if (locator === undefined) {
          return toolFailure(
            "protocol",
            "invalid_input",
            "Contact locator is required.",
            "Provide `contact` when `view` is `events.contact_journal`.",
          );
        }
        const contact = resolveContactLocator(db, locator, "contact");
        if (!contact.ok) {
          return contact.result;
        }
        items = getContactJournal(db, contact.value.id, {
          ...options,
          ...(input.eventTypes === undefined
            ? {}
            : { eventTypes: input.eventTypes }),
        }).map(toEventListToolItem);
        break;
      }
      case "events.link_timeline": {
        const locator = input.link;
        if (locator === undefined) {
          return toolFailure(
            "protocol",
            "invalid_input",
            "Link locator is required.",
            "Provide `link` when `view` is `events.link_timeline`.",
          );
        }
        const link = resolveLinkLocator(db, locator, "link");
        if (!link.ok) {
          return link.result;
        }
        items = getLinkTimeline(db, link.value.id, {
          ...options,
          ...(input.eventTypes === undefined
            ? {}
            : { eventTypes: input.eventTypes }),
        }).map(toEventListToolItem);
        break;
      }
      case "events.moments":
        {
          let contactId: number | undefined;
          let linkId: number | undefined;
          if (input.contact !== undefined) {
            const contact = resolveContactLocator(db, input.contact, "contact");
            if (!contact.ok) {
              return contact.result;
            }
            contactId = contact.value.id;
          }
          if (input.link !== undefined) {
            const link = resolveLinkLocator(db, input.link, "link");
            if (!link.ok) {
              return link.result;
            }
            linkId = link.value.id;
          }
          items = listMoments(
            db,
            {
              ...(input.momentKind === undefined
                ? {}
                : { momentKind: input.momentKind }),
              ...(contactId === undefined ? {} : { contactId }),
              ...(linkId === undefined ? {} : { linkId }),
            },
            options,
          ).map(momentItem);
        }
        break;
      case "commitments.open":
        {
          let contactId: number | undefined;
          let linkId: number | undefined;
          if (input.contact !== undefined) {
            const contact = resolveContactLocator(db, input.contact, "contact");
            if (!contact.ok) {
              return contact.result;
            }
            contactId = contact.value.id;
          }
          if (input.link !== undefined) {
            const link = resolveLinkLocator(db, input.link, "link");
            if (!link.ok) {
              return link.result;
            }
            linkId = link.value.id;
          }
          items = listOpenCommitments(
            db,
            {
              ...(input.commitmentType === undefined
                ? {}
                : { commitmentType: input.commitmentType }),
              ...(contactId === undefined ? {} : { contactId }),
              ...(linkId === undefined ? {} : { linkId }),
              ...(input.horizonDays === undefined
                ? {}
                : { horizonDays: input.horizonDays }),
            },
            options,
          ).map(commitmentItem);
        }
        break;
      case "links.owner":
        items = listOwnerSocialLinks(
          db,
          {
            ...(input.kind === undefined
              ? {}
              : { kind: input.kind as LinkKind }),
            ...(input.linkState === undefined
              ? {}
              : { state: input.linkState }),
          },
          options,
        ).map(toLinkListToolItem);
        break;
      case "links.observed":
        items = listObservedLinks(
          db,
          {
            ...(input.linkState === undefined
              ? {}
              : { state: input.linkState }),
          },
          options,
        ).map(toLinkListToolItem);
        break;
      case "links.progression_readiness":
        items = listProgressionReadiness(
          db,
          {
            ...(input.kind === undefined
              ? {}
              : { kind: input.kind as LinkKind }),
          },
          options,
        ).map(toLinkListToolItem);
        break;
      case "links.radar":
        items = listRadar(
          db,
          {
            ...(input.kind === undefined
              ? {}
              : { kind: input.kind as LinkKind }),
            ...(input.linkState === undefined
              ? {}
              : { state: input.linkState }),
          },
          options,
        ).map(radarItem);
        break;
      case "dates.upcoming":
        items = listUpcomingDates(
          db,
          {
            ...(input.recurrenceKind === undefined
              ? {}
              : { recurrenceKind: input.recurrenceKind }),
            ...(input.kind === undefined
              ? {}
              : { contactKind: input.kind as ContactKind }),
            ...(input.horizonDays === undefined
              ? {}
              : { horizonDays: input.horizonDays }),
          },
          options,
        ).map(upcomingDateItem);
        break;
      case "graph.chart":
        chart = getAffinityChart(db, buildChartOptions(input));
        items = chart.nodes.map((node) => ({
          kind: "contact",
          id: node.contactId,
          title: node.label,
          subtitle: node.kind,
        }));
        break;
      case "merges.history": {
        const locator = input.contact;
        if (locator === undefined) {
          return toolFailure(
            "protocol",
            "invalid_input",
            "Contact locator is required.",
            "Provide `contact` when `view` is `merges.history`.",
          );
        }
        const contact = resolveContactLocator(db, locator, "contact");
        if (!contact.ok) {
          return contact.result;
        }
        items = getMergeHistory(db, contact.value.id, options).map(
          mergeHistoryItem,
        );
        break;
      }
    }

    return toolSuccess(
      summarizeCount(items.length, "item"),
      {
        view: input.view,
        items,
        count: items.length,
        appliedFilters: compactFilters(input),
        ...(chart === undefined ? {} : { chart }),
      },
      {
        entities: items,
        warnings:
          items.length === 0
            ? [
                toolWarning(
                  "empty_result",
                  "This review view is currently empty.",
                ),
              ]
            : undefined,
      },
    );
  }, "Review failed.");
}

export const reviewAffinityTool = defineAffinityTool<
  ReviewAffinityToolInput,
  ReviewAffinityToolResult
>({
  name: reviewAffinityToolName,
  description:
    "Review one affinity surface such as contacts, journals, link queues, commitments, dates, graph state, or merge history.",
  whenToUse:
    "Use this when you want a dashboard-style list or review view instead of inspecting one exact item.",
  whenNotToUse:
    "Do not use this when you already know the exact contact or link you want to inspect in depth.",
  sideEffects: "none",
  readOnly: true,
  supportsClarification: true,
  targetKinds: ["contact", "link", "event"],
  inputDescriptions: {
    view: "Which review surface to return.",
    contact: "Target contact locator for views that require one.",
    link: "Target link locator for views that require one.",
    contactIds:
      "Optional contact id subset for duplicate review or graph review.",
    kind: "Optional contact kind or link kind filter, depending on the view.",
    lifecycleState:
      "Optional contact lifecycle filter for the contact list view.",
    linkState: "Optional link state filter for link review views.",
    includeOwner:
      "Whether owner contacts should be included in contact review.",
    includeDormant:
      "Whether dormant links or contacts should be included where supported.",
    includeArchived:
      "Whether archived links should be included where supported.",
    includeObserved:
      "Whether observed links should be included where supported.",
    eventTypes: "Optional event-type filter for journal and timeline views.",
    momentKind: "Optional moment kind filter for moment review.",
    commitmentType: "Optional promise/agreement filter for commitment review.",
    recurrenceKind: "Optional recurrence-kind filter for upcoming-date review.",
    horizonDays: "Optional horizon filter for commitments or upcoming dates.",
    exactOnly:
      "Whether duplicate review should only include exact identity matches.",
    minScore: "Optional minimum duplicate score.",
    since: "Optional lower timestamp bound for time-based views.",
    until: "Optional upper timestamp bound for time-based views.",
    limit: "Optional result limit.",
    offset: "Optional result offset.",
  },
  outputDescription:
    "Returns compact review items, a count, the applied filters, and the chart payload for graph review.",
  inputSchema: objectSchema(
    {
      view: enumSchema("Which review surface to return.", [
        "contacts.list",
        "contacts.duplicates",
        "events.contact_journal",
        "events.link_timeline",
        "events.moments",
        "commitments.open",
        "links.owner",
        "links.observed",
        "links.progression_readiness",
        "links.radar",
        "dates.upcoming",
        "graph.chart",
        "merges.history",
      ]),
      contact: contactLocatorSchema("Optional target contact locator."),
      link: linkLocatorSchema("Optional target link locator."),
      contactIds: arraySchema(
        integerSchema("Contact id."),
        "Optional contact-id subset.",
      ),
      kind: stringSchema(
        "Optional contact kind or link kind filter, depending on the view.",
      ),
      lifecycleState: enumSchema("Optional contact lifecycle-state filter.", [
        "active",
        "dormant",
        "merged",
        "lost",
      ]),
      linkState: enumSchema("Optional link state filter.", [
        "active",
        "dormant",
        "strained",
        "broken",
        "archived",
      ]),
      includeOwner: booleanSchema("Whether owner contacts are included."),
      includeDormant: booleanSchema("Whether dormant rows are included."),
      includeArchived: booleanSchema("Whether archived links are included."),
      includeObserved: booleanSchema("Whether observed links are included."),
      eventTypes: arraySchema(
        stringSchema("Event type."),
        "Optional event-type filter.",
      ),
      momentKind: enumSchema("Optional moment kind filter.", [
        "breakthrough",
        "rupture",
        "reconciliation",
        "milestone",
        "turning_point",
      ]),
      commitmentType: enumSchema("Optional commitment type filter.", [
        "promise",
        "agreement",
      ]),
      recurrenceKind: enumSchema("Optional recurrence-kind filter.", [
        "birthday",
        "anniversary",
        "renewal",
        "memorial",
        "custom_yearly",
      ]),
      horizonDays: integerSchema("Optional horizon-days filter."),
      exactOnly: booleanSchema("Whether duplicate review is exact-only."),
      minScore: numberSchema("Optional duplicate minimum score."),
      since: integerSchema("Optional lower timestamp bound."),
      until: integerSchema("Optional upper timestamp bound."),
      limit: integerSchema("Optional result limit."),
      offset: integerSchema("Optional result offset."),
    },
    ["view"],
    "Review one affinity surface.",
  ),
  handler: reviewAffinityToolHandler,
});
