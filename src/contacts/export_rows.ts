import type { AffinityDb } from "../database.ts";

/** Convert stored columns to JSON fields consistently for all export paths. */
export function exportRows(
  db: AffinityDb,
  sql: string,
  ...params: number[]
): Record<string, unknown>[] {
  return db
    .prepare(sql)
    .all(...params)
    .map((row) => {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        const name = key.replace(/_([a-z])/g, (_, letter: string) =>
          letter.toUpperCase(),
        );
        result[name] = [
          "is_owner",
          "is_structural",
          "verified",
          "counts_for_recency",
          "manual",
        ].includes(key)
          ? Boolean(value)
          : value instanceof Uint8Array
            ? Buffer.from(value).toString("utf8")
            : value;
        if (name.endsWith("At") && typeof value === "number")
          result[`${name}Iso`] = new Date(value).toISOString();
        if (key.endsWith("_json") && typeof value === "string")
          result[name] = JSON.parse(value);
      }
      return result;
    });
}
