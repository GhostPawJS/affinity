import { closeSync, existsSync, mkdirSync, openSync } from "node:fs";
import { dirname } from "node:path";
import type { AffinityDb } from "../database.ts";
import { initAffinityTables } from "../init_affinity_tables.ts";
import { CliUsageError } from "../surfaces/cli_args.ts";
import { withTransaction } from "../with_transaction.ts";

export async function openAffinityDb(
  path: string,
  options: {
    readOnly?: boolean | undefined;
    stderr?: { write(message: string): unknown } | undefined;
  } = {},
): Promise<AffinityDb> {
  // An explicit in-memory store has no persisted schema or file to protect.
  const readOnly = options.readOnly && path !== ":memory:";
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
  if (!readOnly && path !== ":memory:" && !path.startsWith("file:")) {
    // New databases hold private data: create the directory 0700 and the file 0600.
    const directory = dirname(path);
    try {
      mkdirSync(directory, { recursive: true, mode: 0o700 });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      const reason =
        code === "ENOTDIR" || code === "EEXIST"
          ? "a path component is not a directory"
          : code === "EACCES" || code === "EPERM"
            ? "permission denied"
            : code === "EROFS"
              ? "read-only file system"
              : code;
      throw new CliUsageError(
        `Cannot create database directory ${directory}: ${reason}`,
      );
    }
    if (!existsSync(path)) closeSync(openSync(path, "wx", 0o600));
  }
  if (readOnly && !existsSync(path))
    throw new CliUsageError(
      `Database not found: ${path} (it is created by the first write)`,
    );
  const db = new sqlite.DatabaseSync(path, { readOnly: readOnly ?? false });
  try {
    db.exec("PRAGMA busy_timeout=5000");
    if (readOnly) return db as unknown as AffinityDb;
    const before = db.prepare("PRAGMA schema_version").get() as {
      schema_version: number;
    };
    db.exec("PRAGMA journal_mode=WAL");
    const context = db as unknown as AffinityDb;
    const foreignKeys = db.prepare("PRAGMA foreign_keys").get() as {
      foreign_keys: number;
    };
    db.exec("PRAGMA foreign_keys=OFF");
    try {
      withTransaction(context, () => initAffinityTables(context));
    } finally {
      db.exec(`PRAGMA foreign_keys=${foreignKeys.foreign_keys ? "ON" : "OFF"}`);
    }
    const after = db.prepare("PRAGMA schema_version").get() as {
      schema_version: number;
    };
    if (before.schema_version && before.schema_version !== after.schema_version)
      (options.stderr ?? process.stderr).write(
        "Affinity database schema upgraded.\n",
      );
    if (options.readOnly) db.exec("PRAGMA query_only=ON");
    return context;
  } catch (error) {
    db.close();
    throw error;
  }
}
