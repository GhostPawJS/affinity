import { checkContactable } from "../contacts/check_contactable.ts";
import type { AffinityDb } from "../database.ts";
import { contactLocatorSchema } from "./locator_schema.ts";
import { defineAffinityTool, objectSchema } from "./tool_metadata.ts";
import { checkContactableToolName } from "./tool_names.ts";
import {
  type ContactLocator,
  resolveContactLocator,
  withToolHandling,
} from "./tool_resolvers.ts";
import { type ToolResult, toolFailure, toolSuccess } from "./tool_types.ts";
import { validateToolInput } from "./validate_tool_input.ts";

type Input = { contact: ContactLocator };
type Data = ReturnType<typeof checkContactable>;
export function checkContactableToolHandler(
  db: AffinityDb,
  input: Input,
): ToolResult<Data> {
  const error = validateToolInput(checkContactableTool.inputSchema, input);
  if (error)
    return toolFailure("protocol", "invalid_input", "Invalid input.", error);
  return withToolHandling<Data>(() => {
    const target = resolveContactLocator(db, input.contact, "contact", true);
    if (!target.ok) return target.result;
    const data = checkContactable(db, target.value.id);
    const status = data.contactable
      ? "contactable"
      : `blocked (do not contact) via ${data.blockedBy.map((b) => b.name).join(", ")}`;
    return toolSuccess(
      `Contact #${data.contactId} ${data.name} is ${status}.`,
      data,
      { entities: [{ kind: "contact", id: data.contactId, title: data.name }] },
    );
  }, "Contactability check failed.");
}
export const checkContactableTool = defineAffinityTool<Input, ToolResult<Data>>(
  {
    name: checkContactableToolName,
    description:
      "Check do-not-contact flags through works_at and member_of ties.",
    whenToUse: "Check before outbound contact.",
    whenNotToUse: "Use contact revise to set the flag.",
    sideEffects: "none",
    readOnly: true,
    supportsClarification: true,
    targetKinds: ["contact"],
    inputDescriptions: { contact: "Contact id or identity." },
    outputDescription:
      "Returns contactable and a shortest path to each blocker.",
    inputSchema: objectSchema(
      { contact: contactLocatorSchema("Contact to check.") },
      ["contact"],
    ),
    handler: checkContactableToolHandler,
  },
);
