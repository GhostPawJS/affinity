import { parseCalendarTime } from "../lib/parse_calendar_time.ts";
import { CliUsageError } from "../surfaces/cli_args.ts";
export function parsePlainDue(
  raw: string,
  now = Date.now(),
  endOfDay = true,
): number {
  try {
    return parseCalendarTime(raw, endOfDay ? "dueAt" : "occurredAt", now)
      .timestamp;
  } catch (error) {
    throw new CliUsageError(
      `Invalid timestamp "${raw}". Use YYYY-MM-DD, DD.MM.YYYY or another supported date format. ${(error as Error).message}`,
    );
  }
}
export function parsePlainStart(raw: string, now = Date.now()): number {
  return parsePlainDue(raw, now, false);
}
export function normalizeTimeInputs(
  value: unknown,
  now = Date.now(),
  inPatch = false,
): unknown {
  if (Array.isArray(value))
    return value.map((item) => normalizeTimeInputs(item, now));
  if (!value || typeof value !== "object") return value;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (
      typeof item === "string" &&
      (key.endsWith("At") || ["asOf", "now", "since", "until"].includes(key))
    ) {
      let parsed: ReturnType<typeof parseCalendarTime>;
      try {
        parsed = parseCalendarTime(item, key, now);
      } catch (error) {
        throw new CliUsageError(
          `Invalid timestamp "${item}". ${(error as Error).message}`,
        );
      }
      result[key] = parsed.timestamp;
      if (!inPatch && ["occurredAt", "dueAt"].includes(key))
        result[key.replace(/At$/, "On")] = parsed.day;
    } else result[key] = normalizeTimeInputs(item, now, key === "patch");
  }
  return result;
}
