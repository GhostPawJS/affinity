import type { JsonSchema } from "./surface_types.ts";

/** Each JSONL line dispatches arguments through the selected write tool's schema. */
export function batchSchema(
  tools: readonly {
    name: string;
    readOnly?: boolean;
    inputSchema: JsonSchema;
  }[],
): JsonSchema {
  const writes = tools.filter((tool) => !tool.readOnly);
  const event = writes.find((tool) => tool.name === "record_event");
  return {
    oneOf: [
      ...writes.map((tool) => ({
        type: "object",
        properties: {
          tool: { type: "string", enum: [tool.name] },
          args: tool.inputSchema,
        },
        required: ["tool", "args"],
      })),
      ...(event
        ? [
            {
              type: "object",
              properties: {
                op: { type: "string", enum: ["event"] },
                ...event.inputSchema.properties,
              },
              required: ["op", "kind", "input"],
              anyOf: event.inputSchema.anyOf,
            },
          ]
        : []),
    ],
  };
}
