/**
 * Next yearly anchored calendar date (UTC midnight) on or after the reference instant.
 * Feb 29 anchors materialize as Feb 28 in non-leap years — CONCEPT.md.
 */
export function utcStartOfDayMs(ms: number): number {
  const date = new Date(ms);
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0,
    0,
    0,
    0,
  );
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month1Based: number): number {
  return new Date(Date.UTC(year, month1Based, 0)).getUTCDate();
}

/** Effective calendar day for (year, month) given stored anchor day (handles Feb 29). */
export function effectiveAnchorDay(
  year: number,
  month1Based: number,
  anchorDay: number,
): number {
  if (month1Based === 2 && anchorDay === 29 && !isLeapYear(year)) {
    return 28;
  }
  return Math.min(anchorDay, daysInMonth(year, month1Based));
}

function utcMidnight(year: number, month1Based: number, day: number): number {
  return Date.UTC(year, month1Based - 1, day, 0, 0, 0, 0);
}

export function computeNextAnchorOccursOn(params: {
  anchorMonth: number;
  anchorDay: number;
  referenceMs: number;
}): number {
  const refStart = utcStartOfDayMs(params.referenceMs);
  const refYear = new Date(params.referenceMs).getUTCFullYear();
  for (let year = refYear; year <= refYear + 2; year += 1) {
    const day = effectiveAnchorDay(year, params.anchorMonth, params.anchorDay);
    const candidate = utcMidnight(year, params.anchorMonth, day);
    if (candidate >= refStart) {
      return candidate;
    }
  }
  const year = refYear + 3;
  const day = effectiveAnchorDay(year, params.anchorMonth, params.anchorDay);
  return utcMidnight(year, params.anchorMonth, day);
}
