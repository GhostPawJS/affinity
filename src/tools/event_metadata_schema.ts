import {
  booleanSchema,
  enumSchema,
  integerSchema,
  objectSchema,
  stringSchema,
} from "./tool_metadata.ts";
export const externalRefSchema = objectSchema(
  {
    source: stringSchema("External source; trimmed and lowercased."),
    id: stringSchema("Non-empty external id."),
  },
  ["source", "id"],
);
export const eventMetadataSchema = {
  affectsBond: booleanSchema(
    "Whether evidence affects the relationship; defaults false for like/follow/repost labels and observations with significance <=2; explicit true opts in.",
  ),
  content: stringSchema(
    "Verbatim text, including empty text; at most 1 MB UTF-8. Summary may be omitted when content is supplied.",
  ),
  externalRef: externalRefSchema,
  channel: stringSchema(
    "Free-text channel, trimmed and lowercased, at most 40 characters.",
  ),
  parentRef: externalRefSchema,
  parentEventId: integerSchema("Parent event id."),
  threadRef: externalRefSchema,
  momentKind: enumSchema("Optional moment kind.", [
    "breakthrough",
    "rupture",
    "reconciliation",
    "milestone",
    "turning_point",
  ]),
  occurredOn: stringSchema("Calendar day."),
  provenance: {},
};
