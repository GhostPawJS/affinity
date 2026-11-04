import type { JsonSchema } from "./surface_types.ts";

export function payloadSchema(schema: JsonSchema, kind?: string): JsonSchema {
  const branches = schema.anyOf ?? schema.oneOf;
  if (branches?.some((branch) => branch.properties?.kind)) {
    const selected = branches.filter(
      (branch) => !kind || branch.properties?.kind?.enum?.includes(kind),
    );
    if (!selected.length) throw new Error(`Unknown kind: ${kind}`);
    return kind
      ? (selected[0]?.properties?.input ?? {})
      : {
          anyOf: selected.map((branch) => ({
            ...branch.properties?.input,
            description: String(branch.properties?.kind?.enum?.[0]),
          })),
        };
  }
  const properties = schema.properties ?? {};
  const payload = properties.input ?? properties.patch ?? schema;
  const kinds = payload.properties?.commitmentType?.enum;
  if (kinds) {
    if (kind && !kinds.includes(kind)) throw new Error(`Unknown kind: ${kind}`);
    const variants = kinds
      .filter((value) => !kind || value === kind)
      .map((value) => ({
        ...payload,
        description: String(value),
        properties: {
          ...payload.properties,
          commitmentType: {
            ...payload.properties?.commitmentType,
            enum: [value],
          },
        },
      }));
    return kind ? (variants[0] ?? {}) : { oneOf: variants };
  }
  if (kind) throw new Error(`Unknown kind: ${kind}`);
  return payload;
}

function typeLabel(schema: JsonSchema): string {
  if (schema.enum) return schema.enum.join("|");
  if (schema.items) return `${typeLabel(schema.items)}[]`;
  if (schema.minimum !== undefined)
    return `${schema.type}(${schema.minimum}..${schema.maximum})`;
  if (schema.properties)
    return `{${Object.entries(schema.properties)
      .map(
        ([key, child]) =>
          `${key}${schema.required?.includes(key) ? "" : "?"}:${typeLabel(child)}`,
      )
      .join(",")}}`;
  return String(
    schema.type ??
      (schema.oneOf ?? schema.anyOf)?.map(typeLabel).join("|") ??
      "JSON",
  );
}

function example(schema: JsonSchema, name = ""): unknown {
  if (name === "occurredAt") return "2026-11-01T12:00:00Z";
  if (name === "summary") return "Conversation";
  if (schema.enum) return schema.enum[0];
  if (!schema.properties && (schema.oneOf || schema.anyOf))
    return example((schema.oneOf ?? schema.anyOf)?.[0] ?? {}, name);
  if (schema.properties)
    return Object.fromEntries(
      Object.entries(schema.properties)
        .filter(
          ([key]) =>
            schema.required?.includes(key) ||
            key === "summary" ||
            key === "contactId",
        )
        .map(([key, child]) => [key, example(child, key)]),
    );
  if (schema.items) return [example(schema.items)];
  if (schema.type === "integer" || schema.type === "number") return 1;
  if (schema.type === "boolean") return false;
  return "example";
}

export function payloadHelp(
  schema: JsonSchema,
  bin: string,
  path: string,
  fields?: string[],
): string {
  return Object.entries(schema.properties ?? {})
    .filter(
      ([name, child]) =>
        (!fields || fields.includes(name)) &&
        (child.properties || child.items?.properties),
    )
    .map(([name, child]) => {
      const payload = name === "input" ? payloadSchema(schema) : child;
      const branches = payload.oneOf ??
        (!payload.properties ? payload.anyOf : undefined) ?? [payload];
      const lines = branches.map((branch) => {
        const entries = Object.entries(branch.properties ?? {});
        return `${branches.length > 1 ? `${branch.description}:\n` : ""}  Required: ${
          entries
            .filter(([key]) => branch.required?.includes(key))
            .map(([key, value]) => `${key}:${typeLabel(value)}`)
            .join(", ") || "none"
        }${branch.anyOf?.some((choice) => choice.required?.includes("summary")) ? "; summary:string or content:string" : ""}\n  Optional: ${
          entries
            .filter(([key]) => !branch.required?.includes(key))
            .map(([key, value]) => `${key}:${typeLabel(value)}`)
            .join(", ") || "none"
        }`;
      });
      return `\nPayload (--${name})\n${lines.join("\n")}\n  Example: ${bin} ${path}${branches.length > 1 && schema.properties?.kind ? ` --kind ${branches[0]?.description}` : ""} --${name} '${JSON.stringify(example(branches[0] ?? {}))}'\n`;
    })
    .join("");
}
