import { closeSync, existsSync, mkdirSync, openSync } from "node:fs";
import { dirname } from "node:path";
import type { AffinityDb } from "../database.ts";
import { initAffinityTables } from "../init_affinity_tables.ts";
import { withTransaction } from "../with_transaction.ts";

export async function openAffinityDb(path: string): Promise<AffinityDb> {
  const original = process.emitWarning;
  process.emitWarning = ((warning, ...args: unknown[]) => {
    const type =
      typeof args[0] === "string"
        ? args[0]
        : typeof args[0] === "object" && args[0] !== null && "type" in args[0]
          ? args[0].type
          : warning instanceof Error
            ? warning.name
            : undefined;
    const message = warning instanceof Error ? warning.message : warning;
    if (
      type === "ExperimentalWarning" &&
      message.startsWith("SQLite is an experimental feature")
    )
      return;
    Reflect.apply(original, process, [warning, ...args]);
  }) as typeof process.emitWarning;
  let sqlite: typeof import("node:sqlite");
  try {
    sqlite = await import("node:sqlite");
  } finally {
    process.emitWarning = original;
  }
  if (path !== ":memory:" && !path.startsWith("file:")) {
    // New databases hold private data: create the directory 0700 and the file 0600.
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    if (!existsSync(path)) closeSync(openSync(path, "wx", 0o600));
  }
  const db = new sqlite.DatabaseSync(path);
  try {
    db.exec("PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;");
    const context = db as unknown as AffinityDb;
    withTransaction(context, () => initAffinityTables(context));
    return context;
  } catch (error) {
    db.close();
    throw error;
  }
}
