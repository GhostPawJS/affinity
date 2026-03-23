import type { AffinityDb } from "../database.ts";
import type { ToolResult } from "./tool_types.ts";

export type ToolInputDescriptions = Readonly<Record<string, string>>;
export type ToolOutputDescription = string;

export type JsonSchemaType =
  | "array"
  | "boolean"
  | "integer"
  | "null"
  | "number"
  | "object"
  | "string";

export interface JsonSchema {
  type?: JsonSchemaType | undefined;
  description?: string | undefined;
  enum?: ReadonlyArray<boolean | number | string | null> | undefined;
  const?: boolean | number | string | null;
  items?: JsonSchema | undefined;
  properties?: Readonly<Record<string, JsonSchema>> | undefined;
  required?: ReadonlyArray<string> | undefined;
  additionalProperties?: boolean | undefined;
  oneOf?: ReadonlyArray<JsonSchema> | undefined;
  anyOf?: ReadonlyArray<JsonSchema> | undefined;
}

export type ToolSideEffects = "none" | "writes_state";

export interface AffinityToolDefinition<
  TInput,
  TResult extends ToolResult<unknown>,
> {
  name: string;
  description: string;
  whenToUse: string;
  whenNotToUse?: string | undefined;
  sideEffects: ToolSideEffects;
  readOnly: boolean;
  supportsClarification: boolean;
  targetKinds: readonly string[];
  inputDescriptions: ToolInputDescriptions;
  outputDescription: ToolOutputDescription;
  inputSchema: JsonSchema;
  handler: (db: AffinityDb, input: TInput) => TResult;
}

export type ToolDefinitionRegistry = readonly AffinityToolDefinition<
  never,
  ToolResult<unknown>
>[];

export function defineAffinityTool<
  TInput,
  TResult extends ToolResult<unknown>,
>(
  definition: AffinityToolDefinition<TInput, TResult>,
): AffinityToolDefinition<TInput, TResult> {
  return definition;
}

export function stringSchema(
  description: string,
  options: Partial<JsonSchema> = {},
): JsonSchema {
  return { type: "string", description, ...options };
}

export function numberSchema(
  description: string,
  options: Partial<JsonSchema> = {},
): JsonSchema {
  return { type: "number", description, ...options };
}

export function integerSchema(
  description: string,
  options: Partial<JsonSchema> = {},
): JsonSchema {
  return { type: "integer", description, ...options };
}

export function booleanSchema(
  description: string,
  options: Partial<JsonSchema> = {},
): JsonSchema {
  return { type: "boolean", description, ...options };
}

export function enumSchema(
  description: string,
  values: ReadonlyArray<boolean | number | string | null>,
): JsonSchema {
  const schema: JsonSchema = {
    description,
    enum: values,
  };
  if (values.every((value) => typeof value === "string")) {
    schema.type = "string";
  }
  return schema;
}

export function literalSchema(
  value: boolean | number | string | null,
  description?: string,
): JsonSchema {
  const schema: JsonSchema = {
    type:
      value === null
        ? "null"
        : typeof value === "string"
          ? "string"
          : typeof value === "number"
            ? "number"
            : "boolean",
    const: value,
  };
  if (description !== undefined) {
    schema.description = description;
  }
  return schema;
}

export function arraySchema(items: JsonSchema, description: string): JsonSchema {
  return {
    type: "array",
    description,
    items,
  };
}

export function objectSchema(
  properties: Record<string, JsonSchema>,
  required: ReadonlyArray<string>,
  description?: string,
): JsonSchema {
  const schema: JsonSchema = {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
  if (description !== undefined) {
    schema.description = description;
  }
  return schema;
}

export function nullableStringSchema(
  description: string,
): JsonSchema {
  return { anyOf: [{ type: "string" }, { type: "null" }], description };
}

export function oneOfSchema(
  schemas: ReadonlyArray<JsonSchema>,
  description?: string,
): JsonSchema {
  const schema: JsonSchema = {
    oneOf: schemas,
  };
  if (description !== undefined) {
    schema.description = description;
  }
  return schema;
}
