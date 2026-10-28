import { AffinityValidationError } from "./errors/affinity_validation_error.ts";

export const timeInputForms =
  "epoch milliseconds integer, ISO 8601 date-time with Z/offset, YYYY-MM-DD, DD.MM.YYYY, today, tomorrow, yesterday, +3d or -2d";

/** Only keyword resolution uses the process local calendar. Stored day boundaries are UTC. */
/**
 * A due value entered as a calendar day is stored at 23:59:59.999Z of that day.
 * Such values become overdue when the local calendar date passes the day;
 * exact timestamps become overdue when the instant passes.
 */
export function isCommitmentOverdue(
  dueAt: number | null,
  dueOn: string | null | undefined,
  now: number,
): boolean {
  if (dueAt === null) return false;
  if (dueOn && dueAt === Date.parse(`${dueOn}T23:59:59.999Z`)) {
    return localCalendarDate(now) > dueOn;
  }
  return dueAt < now;
}

/** SQL twin of isCommitmentOverdue for open_commitments rows aliased as oc. */
export const OVERDUE_SQL =
  "(CASE WHEN oc.due_on IS NOT NULL AND oc.due_at = CAST(strftime('%s', oc.due_on) AS INTEGER) * 1000 + 86399999 THEN oc.due_on < ? ELSE oc.due_at < ? END)";

export function localCalendarDate(now: number): string {
  const d = new Date(now);
  return `${String(d.getFullYear()).padStart(4, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseCalendarTime(
  value: number | string,
  field = "time",
  now = Date.now(),
): { timestamp: number; day: string } {
  if (value == null && field.endsWith("occurredAt"))
    throw new AffinityValidationError(
      "occurredAt is required (ISO, YYYY-MM-DD, epoch ms, today, +3d …)",
    );
  const fail = (): never => {
    throw new AffinityValidationError(`${field}: expected ${timeInputForms}`);
  };
  if (
    typeof value === "number" ||
    (typeof value === "string" && /^-?\d+$/.test(value.trim()))
  ) {
    const timestamp = Number(value);
    if (
      !Number.isSafeInteger(timestamp) ||
      !Number.isFinite(new Date(timestamp).getTime())
    )
      return fail();
    return { timestamp, day: new Date(timestamp).toISOString().slice(0, 10) };
  }
  if (typeof value !== "string") return fail();
  let text = value.trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(text)) {
    text = text.replace(" ", "T");
    if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(text)) text += "Z";
  }
  let rounding = 0;
  text = text.replace(
    /\.(\d{4,})(?=Z|[+-]\d{2}:\d{2}$)/,
    (_, digits: string) => {
      const ms = Math.round(Number(`0.${digits}`) * 1000);
      rounding = ms === 1000 ? 1 : 0;
      return `.${String(ms === 1000 ? 999 : ms).padStart(3, "0")}`;
    },
  );
  if (/^(today|yesterday|tomorrow|[+-]\d+d)$/.test(text)) {
    const offset =
      text === "today"
        ? 0
        : text === "tomorrow"
          ? 1
          : text === "yesterday"
            ? -1
            : Number(text.slice(0, -1));
    const date = new Date(`${localCalendarDate(now)}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    if (!Number.isFinite(date.getTime())) return fail();
    text = date.toISOString().slice(0, 10);
  }
  const european = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text);
  if (european) text = `${european[3]}-${european[2]}-${european[1]}`;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(text);
  if (
    !dateOnly &&
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      text,
    )
  )
    return fail();
  const day = text.slice(0, 10);
  const midnight = Date.parse(`${day}T00:00:00Z`);
  if (
    !Number.isFinite(midnight) ||
    new Date(midnight).toISOString().slice(0, 10) !== day
  )
    return fail();
  const timestamp = dateOnly
    ? midnight + (field.split(".").at(-1) === "dueAt" ? 86399999 : 0)
    : Date.parse(text) + rounding;
  if (!Number.isFinite(timestamp)) return fail();
  return { timestamp, day };
}
