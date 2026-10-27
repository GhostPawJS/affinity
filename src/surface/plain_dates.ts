import { CliUsageError } from "../surfaces/cli_args.ts";

export function parsePlainDue(
  raw: string,
  now = Date.now(),
  endOfDay = true,
): number {
  const invalid = () =>
    new CliUsageError(
      `Invalid timestamp "${raw}". Use YYYY-MM-DD, DD.MM.YYYY, today, tomorrow, yesterday, +3d, -2d or an ISO date-time.`,
    );
  if (/^-?\d+$/.test(raw)) {
    const value = Number(raw);
    if (
      Number.isSafeInteger(value) &&
      Number.isFinite(new Date(value).getTime())
    )
      return value;
    throw invalid();
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  const european = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(raw);
  let date: Date;
  if (iso || european) {
    const year = Number(iso?.[1] ?? european?.[3]);
    const month = Number(iso?.[2] ?? european?.[2]);
    const day = Number(iso?.[3] ?? european?.[1]);
    date = new Date(0);
    date.setFullYear(year, month - 1, day);
    date.setHours(
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0,
    );
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    )
      throw invalid();
  } else if (
    raw === "today" ||
    raw === "tomorrow" ||
    raw === "yesterday" ||
    /^[+-]\d+d$/.test(raw)
  ) {
    date = new Date(now);
    date.setDate(
      date.getDate() +
        (raw === "today"
          ? 0
          : raw === "tomorrow"
            ? 1
            : raw === "yesterday"
              ? -1
              : Number(raw.slice(0, -1))),
    );
    date.setHours(
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0,
    );
  } else {
    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(
        raw,
      )
    )
      throw invalid();
    parsePlainDue(raw.slice(0, 10), now);
    date = new Date(raw);
  }
  if (!Number.isFinite(date.getTime())) throw invalid();
  return date.getTime();
}

export function parsePlainStart(raw: string, now = Date.now()): number {
  return parsePlainDue(raw, now, false);
}

export function normalizeTimeInputs(value: unknown, now = Date.now()): unknown {
  if (Array.isArray(value))
    return value.map((item) => normalizeTimeInputs(item, now));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      typeof item === "string" &&
      (key.endsWith("At") || ["asOf", "now"].includes(key))
        ? key === "dueAt"
          ? parsePlainDue(item, now)
          : parsePlainStart(item, now)
        : normalizeTimeInputs(item, now),
    ]),
  );
}
