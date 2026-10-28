import { parseCalendarTime } from "../lib/parse_calendar_time.ts";
import { parseTimeInput } from "./parse_time_input.ts";
import type { JsonSchema } from "./tool_metadata.ts";

/** Validate direct handler calls as well as transport calls. Returns the first field error. */
export function validateToolInput(
  schema: JsonSchema,
  value: unknown,
  path = "input",
  injectedNow = Date.now(),
  strict = false,
): string | null {
  if (path.endsWith(".occurredAt") && value == null)
    return "occurredAt is required (ISO, YYYY-MM-DD, epoch ms, today, +3d …)";
  const branches = schema.oneOf ?? schema.anyOf;
  if (
    path.endsWith(".value") &&
    branches?.some((b) => b.type === "string") &&
    branches.some((b) => b.type === "null") &&
    value !== null &&
    typeof value !== "string"
  )
    return `attribute values are strings or null; pass "${String(value)}" to store it as text`;
  if (schema.anyOf || schema.oneOf) {
    const choices = schema.anyOf ?? schema.oneOf ?? [];
    return choices.some(
      (choice) =>
        validateToolInput(choice, value, path, injectedNow, strict) === null,
    )
      ? null
      : `${path}: invalid value`;
  }
  if (schema.type === "object") {
    if (value === null || typeof value !== "object" || Array.isArray(value))
      return `${path}: missing input or expected object`;
    const object = value as Record<string, unknown>;
    if (
      (strict || path.endsWith(".patch")) &&
      schema.additionalProperties === false
    ) {
      for (const key of Object.keys(object)) {
        if (!Object.hasOwn(schema.properties ?? {}, key))
          return key === "kind" && "name" in (schema.properties ?? {})
            ? "kind cannot be changed after creation"
            : `${path}.${key}: unknown ${path.endsWith(".patch") ? "patch key" : "key"}; allowed keys: ${Object.keys(schema.properties ?? {}).join(", ")}`;
      }
    }
    if (
      object.action === "revise" &&
      schema.properties?.patch &&
      object.patch === undefined
    )
      return `${path}.patch: missing required field`;
    if (object.patch !== undefined && !schema.properties?.patch)
      return `${path}.patch: unknown key; allowed keys: none (use the action's named fields)`;
    const referenceNow =
      object.now === undefined
        ? injectedNow
        : (() => {
            try {
              return parseTimeInput(
                object.now as number | string,
                `${path}.now`,
                injectedNow,
              );
            } catch {
              return Date.now();
            }
          })();
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      if (
        object[key] !== undefined &&
        (key.endsWith("At") ||
          ["now", "asOf", "since", "until"].includes(key)) &&
        child.oneOf?.some((choice) => choice.type === "integer")
      ) {
        try {
          const parsed = parseCalendarTime(
            object[key] as number | string,
            `${path}.${key}`,
            referenceNow,
          );
          object[key] = parsed.timestamp;
          if (!path.endsWith(".patch") && ["occurredAt", "dueAt"].includes(key))
            object[key.replace(/At$/, "On")] ??= parsed.day;
        } catch (error) {
          return (error as Error).message;
        }
      }
    }
    for (const key of schema.required ?? []) {
      if (object[key] === undefined)
        return `${path}.${key}: missing required field`;
    }
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      if (object[key] === undefined) continue;
      const error = validateToolInput(
        child,
        object[key],
        `${path}.${key}`,
        referenceNow,
        strict,
      );
      if (error) return error;
    }
    return null;
  }
  if (schema.type === "array") {
    if (!Array.isArray(value)) return `${path}: expected array`;
    for (const [index, item] of value.entries()) {
      const error = validateToolInput(
        schema.items ?? {},
        item,
        `${path}[${index}]`,
        injectedNow,
        strict,
      );
      if (error) return error;
    }
    return null;
  }
  if (schema.enum && !schema.enum.includes(value as string))
    return `${path}: expected ${schema.enum.join(", ")}`;
  if (schema.type === "null")
    return value === null ? null : `${path}: expected null`;
  if (schema.type === "integer")
    return Number.isInteger(value) ? null : `${path}: expected integer`;
  const valid =
    schema.type === undefined ||
    (schema.type === "string" && typeof value === "string") ||
    (schema.type === "number" &&
      typeof value === "number" &&
      Number.isFinite(value)) ||
    (schema.type === "boolean" && typeof value === "boolean");
  if (!valid) return `${path}: expected ${schema.type}`;
  return null;
}
