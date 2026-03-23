import {
  inspectAffinityItemToolName,
  manageAttributeToolName,
  manageCommitmentToolName,
  manageContactToolName,
  manageDateAnchorToolName,
  manageIdentityToolName,
  manageRelationshipToolName,
  mergeContactsToolName,
  recordEventToolName,
  reviewAffinityToolName,
  searchAffinityToolName,
} from "./tool_names.ts";

export interface AffinityToolMapping {
  source: string;
  tool: string;
  action?: string;
  view?: string;
  notes?: string;
}

export const affinityToolMappings: AffinityToolMapping[] = [
  { source: "searchContacts", tool: searchAffinityToolName },
  {
    source: "getOwnerProfile",
    tool: inspectAffinityItemToolName,
    action: "owner_profile",
  },
  {
    source: "getContactProfile",
    tool: inspectAffinityItemToolName,
    action: "contact_profile",
  },
  { source: "getLinkDetail", tool: inspectAffinityItemToolName, action: "link" },
  { source: "listContacts", tool: reviewAffinityToolName, view: "contacts.list" },
  {
    source: "listDuplicateCandidates",
    tool: reviewAffinityToolName,
    view: "contacts.duplicates",
  },
  {
    source: "getContactJournal",
    tool: reviewAffinityToolName,
    view: "events.contact_journal",
  },
  {
    source: "getLinkTimeline",
    tool: reviewAffinityToolName,
    view: "events.link_timeline",
  },
  { source: "listMoments", tool: reviewAffinityToolName, view: "events.moments" },
  {
    source: "listOpenCommitments",
    tool: reviewAffinityToolName,
    view: "commitments.open",
  },
  { source: "listOwnerSocialLinks", tool: reviewAffinityToolName, view: "links.owner" },
  {
    source: "listObservedLinks",
    tool: reviewAffinityToolName,
    view: "links.observed",
  },
  {
    source: "listProgressionReadiness",
    tool: reviewAffinityToolName,
    view: "links.progression_readiness",
  },
  { source: "listRadar", tool: reviewAffinityToolName, view: "links.radar" },
  { source: "listUpcomingDates", tool: reviewAffinityToolName, view: "dates.upcoming" },
  { source: "getAffinityChart", tool: reviewAffinityToolName, view: "graph.chart" },
  { source: "getMergeHistory", tool: reviewAffinityToolName, view: "merges.history" },
  { source: "createContact", tool: manageContactToolName, action: "create" },
  { source: "reviseContact", tool: manageContactToolName, action: "revise" },
  {
    source: "setContactLifecycle",
    tool: manageContactToolName,
    action: "set_lifecycle",
  },
  { source: "mergeContacts", tool: mergeContactsToolName },
  { source: "addIdentity", tool: manageIdentityToolName, action: "add" },
  { source: "reviseIdentity", tool: manageIdentityToolName, action: "revise" },
  { source: "verifyIdentity", tool: manageIdentityToolName, action: "verify" },
  { source: "removeIdentity", tool: manageIdentityToolName, action: "remove" },
  {
    source: "seedSocialLink",
    tool: manageRelationshipToolName,
    action: "seed_social_link",
  },
  {
    source: "reviseBond",
    tool: manageRelationshipToolName,
    action: "revise_bond",
  },
  {
    source: "overrideLinkState",
    tool: manageRelationshipToolName,
    action: "override_state",
  },
  {
    source: "setStructuralTie",
    tool: manageRelationshipToolName,
    action: "set_structural_tie",
  },
  {
    source: "removeStructuralTie",
    tool: manageRelationshipToolName,
    action: "remove_structural_tie",
  },
  { source: "recordInteraction", tool: recordEventToolName, action: "interaction" },
  { source: "recordObservation", tool: recordEventToolName, action: "observation" },
  { source: "recordMilestone", tool: recordEventToolName, action: "milestone" },
  { source: "recordTransaction", tool: recordEventToolName, action: "transaction" },
  { source: "recordCommitment", tool: manageCommitmentToolName, action: "record" },
  { source: "resolveCommitment", tool: manageCommitmentToolName, action: "resolve" },
  { source: "addDateAnchor", tool: manageDateAnchorToolName, action: "add" },
  { source: "reviseDateAnchor", tool: manageDateAnchorToolName, action: "revise" },
  { source: "removeDateAnchor", tool: manageDateAnchorToolName, action: "remove" },
  { source: "setAttribute", tool: manageAttributeToolName, action: "set" },
  { source: "unsetAttribute", tool: manageAttributeToolName, action: "unset" },
  { source: "replaceAttributes", tool: manageAttributeToolName, action: "replace" },
];
