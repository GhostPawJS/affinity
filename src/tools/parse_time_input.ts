import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";

export const timeInputForms =
  "epoch milliseconds integer, ISO 8601 date-time with Z/offset, YYYY-MM-DD, today, tomorrow, yesterday, +3d or -2d";
export type TimeInputs<T> = T extends readonly (infer U)[]
  ? readonly TimeInputs<U>[]
  : T extends object
    ? {
        [K in keyof T]: K extends
          | `${string}At`
          | "now"
          | "asOf"
          | "since"
          | "until"
          ? T[K] | string
          : TimeInputs<T[K]>;
      }
    : T;

/** Parse human time inputs using UTC days. Library mutations still accept numbers. */
export function parseTimeInput(
  value: number | string,
  field = "time",
  now = Date.now(),
): number {
  const fail = () => {
    throw new AffinityValidationError(`${field}: expected ${timeInputForms}`);
  };
  if (typeof value === "number")
    return Number.isSafeInteger(value) &&
      Number.isFinite(new Date(value).getTime())
      ? value
      : fail();
  if (typeof value !== "string") return fail();
  const text = value.trim();
  const relative = /^(?:today|tomorrow|yesterday|[+-]\d+d)$/.test(text);
  let day: number;
  if (relative) {
    const offset =
      text === "today"
        ? 0
        : text === "tomorrow"
          ? 1
          : text === "yesterday"
            ? -1
            : Number(text.slice(0, -1));
    day = Math.floor(now / 86400000) * 86400000 + offset * 86400000;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    day = Date.parse(`${text}T00:00:00.000Z`);
    if (
      !Number.isFinite(day) ||
      new Date(day).toISOString().slice(0, 10) !== text
    )
      return fail();
  } else {
    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(
        text,
      )
    )
      return fail();
    const calendar = Date.parse(`${text.slice(0, 10)}T00:00:00Z`);
    if (
      !Number.isFinite(calendar) ||
      new Date(calendar).toISOString().slice(0, 10) !== text.slice(0, 10)
    )
      return fail();
    const parsed = Date.parse(text);
    return Number.isFinite(parsed) ? parsed : fail();
  }
  const result = day + (field.split(".").at(-1) === "dueAt" ? 86399999 : 0);
  return Number.isSafeInteger(result) &&
    Number.isFinite(new Date(result).getTime())
    ? result
    : fail();
}
