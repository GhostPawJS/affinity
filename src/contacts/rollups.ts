import type { AffinityDb } from "../database.ts";
import type { OpaqueRollup } from "../lib/types/rollup_opaque.ts";

function parseJsonObject(raw: string): OpaqueRollup {
  try {
    const parsed = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object"
      ? (parsed as OpaqueRollup)
      : {};
  } catch {
    return {};
  }
}

function parseWarnings(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export function loadContactRollup(
  db: AffinityDb,
  contactId: number,
): {
  warningCount: number;
  warnings: readonly string[];
  rollup: OpaqueRollup;
} | null {
  const row = db
    .prepare(
      `SELECT warning_count, warnings_json, rollup_json
       FROM contact_rollups
       WHERE contact_id = ?`,
    )
    .get(contactId) as
    | {
        warning_count: number;
        warnings_json: string;
        rollup_json: string;
      }
    | undefined;
  if (row === undefined) {
    return null;
  }
  return {
    warningCount: row.warning_count,
    warnings: parseWarnings(row.warnings_json),
    rollup: parseJsonObject(row.rollup_json),
  };
}

export function refreshContactRollup(
  db: AffinityDb,
  contactId: number,
  now: number,
): void {
  const liveIdentityCount = Number(
    (
      db
        .prepare(
          `SELECT COUNT(*) AS c
         FROM identities
         WHERE contact_id = ? AND removed_at IS NULL`,
        )
        .get(contactId) as { c?: number } | undefined
    )?.c ?? 0,
  );
  const warnings = liveIdentityCount === 0 ? ["missing_identity"] : [];
  db.prepare(
    `INSERT INTO contact_rollups (
       contact_id, warning_count, warnings_json, rollup_json, updated_at
     ) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(contact_id) DO UPDATE SET
       warning_count = excluded.warning_count,
       warnings_json = excluded.warnings_json,
       rollup_json = excluded.rollup_json,
       updated_at = excluded.updated_at`,
  ).run(contactId, warnings.length, JSON.stringify(warnings), "{}", now);
}
