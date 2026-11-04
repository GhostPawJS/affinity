import { withTimeZone } from "../lib/time_zone.ts";
import { type ToolResult, toolFailure } from "./tool_types.ts";

export function withToolTimeZone<T extends ToolResult<unknown>>(
  input: { tz?: string },
  operation: () => T,
): T {
  try {
    return input?.tz === undefined
      ? operation()
      : withTimeZone(input.tz, operation);
  } catch (error) {
    return toolFailure(
      "protocol",
      "invalid_input",
      "Invalid input.",
      (error as Error).message,
    ) as T;
  }
}
