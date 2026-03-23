import type { ToolDefinitionRegistry } from "./tool_metadata.ts";
import { inspectAffinityItemTool } from "./inspect_affinity_item_tool.ts";
import { manageAttributeTool } from "./manage_attribute_tool.ts";
import { manageCommitmentTool } from "./manage_commitment_tool.ts";
import { manageContactTool } from "./manage_contact_tool.ts";
import { manageDateAnchorTool } from "./manage_date_anchor_tool.ts";
import { manageIdentityTool } from "./manage_identity_tool.ts";
import { manageRelationshipTool } from "./manage_relationship_tool.ts";
import { mergeContactsTool } from "./merge_contacts_tool.ts";
import { recordEventTool } from "./record_event_tool.ts";
import { reviewAffinityTool } from "./review_affinity_tool.ts";
import { searchAffinityTool } from "./search_affinity_tool.ts";

export const affinityTools = [
  searchAffinityTool,
  reviewAffinityTool,
  inspectAffinityItemTool,
  manageContactTool,
  mergeContactsTool,
  manageIdentityTool,
  manageRelationshipTool,
  recordEventTool,
  manageCommitmentTool,
  manageDateAnchorTool,
  manageAttributeTool,
] satisfies ToolDefinitionRegistry;

export function listAffinityToolDefinitions() {
  return [...affinityTools];
}

export function getAffinityToolByName(name: string) {
  return affinityTools.find((tool) => tool.name === name) ?? null;
}
