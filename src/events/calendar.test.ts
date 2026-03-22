import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeNextAnchorOccursOn,
  effectiveAnchorDay,
  utcStartOfDayMs,
} from "./calendar.ts";

describe("events calendar", () => {
  it("returns same-year occurrence when reference is before anchor", () => {
    const ref = Date.UTC(2025, 1, 1, 12, 0, 0, 0);
    const next = computeNextAnchorOccursOn({
      anchorMonth: 3,
      anchorDay: 15,
      referenceMs: ref,
    });
    strictEqual(next, Date.UTC(2025, 2, 15, 0, 0, 0, 0));
  });

  it("rolls to next year when reference is after this year's anchor", () => {
    const ref = Date.UTC(2025, 3, 20, 12, 0, 0, 0);
    const next = computeNextAnchorOccursOn({
      anchorMonth: 3,
      anchorDay: 15,
      referenceMs: ref,
    });
    strictEqual(next, Date.UTC(2026, 2, 15, 0, 0, 0, 0));
  });

  it("maps Feb 29 to Feb 28 in non-leap years", () => {
    strictEqual(effectiveAnchorDay(2025, 2, 29), 28);
    strictEqual(effectiveAnchorDay(2024, 2, 29), 29);
  });

  it("includes today when anchor falls on the reference day", () => {
    const ref = Date.UTC(2025, 2, 15, 18, 0, 0, 0);
    strictEqual(utcStartOfDayMs(ref), Date.UTC(2025, 2, 15, 0, 0, 0, 0));
    const next = computeNextAnchorOccursOn({
      anchorMonth: 3,
      anchorDay: 15,
      referenceMs: ref,
    });
    strictEqual(next, Date.UTC(2025, 2, 15, 0, 0, 0, 0));
  });
});
