import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTimeInput } from "./parse_time_input.ts";

const now = Date.parse("2026-10-27T15:12:00Z");
test("time inputs use strict UTC calendar days and explicit offsets", () => {
  for (const [input, expected] of [
    ["today", "2026-10-27"],
    ["tomorrow", "2026-10-28"],
    ["yesterday", "2026-10-26"],
    ["+3d", "2026-10-30"],
    ["-2d", "2026-10-25"],
    ["2024-02-29", "2024-02-29"],
  ]) {
    assert.equal(
      parseTimeInput(input as string, "occurredAt", now),
      Date.parse(`${expected}T00:00:00Z`),
    );
    assert.equal(
      parseTimeInput(input as string, "input.dueAt", now),
      Date.parse(`${expected}T23:59:59.999Z`),
    );
  }
  assert.equal(parseTimeInput(now), now);
  assert.equal(
    parseTimeInput("2026-10-20T14:00:00+02:00"),
    Date.parse("2026-10-20T12:00:00Z"),
  );
  assert.equal(
    parseTimeInput("2026-10-20T14:00:00Z", "dueAt"),
    Date.parse("2026-10-20T14:00:00Z"),
  );
  for (const bad of [
    "2026-02-30",
    "2026-02-30T14:00:00Z",
    "2026-10-20T14:00:00",
    "next week",
    "",
    "1790000000000",
    "27.10.2026",
    "2026-13-01",
  ]) {
    assert.throws(
      () => parseTimeInput(bad, "dueAt", now),
      /dueAt: expected epoch milliseconds integer, ISO 8601/,
    );
  }
  assert.throws(() => parseTimeInput(1.5), /expected/);
  assert.throws(() => parseTimeInput(Number.NaN), /expected/);
});
