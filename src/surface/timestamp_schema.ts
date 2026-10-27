import type { JsonSchema } from "../surfaces/surface_types.ts";

function acceptsString(schema: JsonSchema): boolean {
  return (
    schema.type === "string" ||
    (Array.isArray(schema.type) && schema.type.includes("string")) ||
    (schema.oneOf?.some(acceptsString) ?? false)
  );
}

export function timestampSchema(schema: JsonSchema): JsonSchema {
  return {
    ...schema,
    ...(schema.properties
      ? {
          properties: Object.fromEntries(
            Object.entries(schema.properties).map(([key, value]) => [
              key,
              key.endsWith("At") || ["asOf", "now"].includes(key)
                ? acceptsString(value)
                  ? value
                  : {
                      description: value.description,
                      oneOf: [value, { type: "string" }],
                    }
                : timestampSchema(value),
            ]),
          ),
        }
      : {}),
    ...(schema.items ? { items: timestampSchema(schema.items) } : {}),
    ...(schema.oneOf ? { oneOf: schema.oneOf.map(timestampSchema) } : {}),
  };
}
