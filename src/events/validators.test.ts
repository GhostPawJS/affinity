import { strictEqual, throws } from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { initAffinityTables } from "../init_affinity_tables.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import {
  assertOwnerParticipates,
  assertParticipantContactsLive,
  assertValidRecurrenceKind,
  validateAnchorCalendar,
  validateSocialEventInput,
} from "./validators.ts";

describe("events validators", () => {
  it("requires owner participation", () => {
    assertOwnerParticipates(1, [1, 2]);
    throws(
      () => assertOwnerParticipates(1, [2]),
      (error: unknown) => error instanceof AffinityValidationError,
    );
  });

  it("checks participant contacts for missing and merged rows", () => {
    const db = new DatabaseSync(":memory:");
    initAffinityTables(db);
    throws(
      () => assertParticipantContactsLive(db, [1]),
      (error: unknown) => error instanceof AffinityNotFoundError,
    );
    db.prepare(
      `INSERT INTO contacts
         (name, kind, lifecycle_state, created_at, updated_at)
       VALUES (?, ?, 'merged', ?, ?)`,
    ).run("A", "human", 1, 1);
    throws(
      () => assertParticipantContactsLive(db, [1]),
      (error: unknown) => error instanceof AffinityStateError,
    );
    db.close();
  });

  it("validates social event payloads, recurrence kinds, and anchor calendars", () => {
    validateSocialEventInput({
      occurredAt: 1,
      summary: "hello",
      significance: 5,
      participants: [{ contactId: 1, role: "actor" }],
    });
    assertValidRecurrenceKind("birthday");
    validateAnchorCalendar(12, 31);
    throws(
      () =>
        validateSocialEventInput({
          occurredAt: 1,
          summary: " ",
          significance: 5,
          participants: [{ contactId: 1, role: "actor" }],
        }),
      (error: unknown) => error instanceof AffinityValidationError,
    );
    throws(
      () =>
        validateSocialEventInput({
          occurredAt: 1,
          summary: "hello",
          significance: 5,
          participants: [
            { contactId: 1, role: "actor" },
            { contactId: 1, role: "recipient" },
          ],
        }),
      (error: unknown) => error instanceof AffinityValidationError,
    );
    throws(
      () =>
        validateSocialEventInput({
          occurredAt: 1,
          summary: "hello",
          significance: 5,
          participants: [
            {
              contactId: 1,
              role: "actor",
              directionality: "sideways" as never,
            },
          ],
        }),
      (error: unknown) => error instanceof AffinityValidationError,
    );
    throws(
      () => assertValidRecurrenceKind("weekly"),
      (error: unknown) => error instanceof AffinityValidationError,
    );
    throws(
      () => validateAnchorCalendar(13, 1),
      (error: unknown) => error instanceof AffinityValidationError,
    );
    strictEqual(true, true);
  });
});
