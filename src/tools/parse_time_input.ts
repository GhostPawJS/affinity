import { parseCalendarTime } from "../lib/parse_calendar_time.ts";
export { timeInputForms } from "../lib/parse_calendar_time.ts";
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

export function parseTimeInput(
  value: number | string,
  field = "time",
  now = Date.now(),
): number {
  return parseCalendarTime(value, field, now).timestamp;
}
