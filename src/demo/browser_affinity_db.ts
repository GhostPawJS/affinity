import type {
  AffinityDb,
  AffinityRunResult,
  AffinityStatement,
} from "../database.ts";
import { type SqlJsDatabase, loadSqlJs } from "./load_sqljs.ts";

function normalizeParam(value: unknown): unknown {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (value === undefined) {
    return null;
  }
  return value;
}

function normalizeParams(params: readonly unknown[]): unknown[] {
  return params.map(normalizeParam);
}

function readRunResult(db: SqlJsDatabase): AffinityRunResult {
  const result = db.exec(
    "SELECT last_insert_rowid() AS lastInsertRowid, changes() AS changes",
  );
  const row = result[0]?.values[0];
  return {
    lastInsertRowid:
      typeof row?.[0] === "number" || typeof row?.[0] === "bigint" ? row[0] : 0,
    changes: Number(row?.[1] ?? 0),
  };
}

class BrowserAffinityStatement implements AffinityStatement {
  constructor(
    private readonly db: SqlJsDatabase,
    private readonly sql: string,
  ) {}

  run(...params: unknown[]): AffinityRunResult {
    const boundParams = normalizeParams(params);
    if (boundParams.length === 0) {
      this.db.run(this.sql);
    } else {
      this.db.run(this.sql, boundParams);
    }
    return readRunResult(this.db);
  }

  get<TRecord = unknown>(...params: unknown[]): TRecord | undefined {
    const statement = this.db.prepare(this.sql);
    try {
      const boundParams = normalizeParams(params);
      if (boundParams.length > 0) {
        statement.bind(boundParams);
      }
      if (!statement.step()) {
        return undefined;
      }
      return statement.getAsObject() as TRecord;
    } finally {
      statement.free();
    }
  }

  all<TRecord = unknown>(...params: unknown[]): TRecord[] {
    const statement = this.db.prepare(this.sql);
    try {
      const boundParams = normalizeParams(params);
      if (boundParams.length > 0) {
        statement.bind(boundParams);
      }
      const rows: TRecord[] = [];
      while (statement.step()) {
        rows.push(statement.getAsObject() as TRecord);
      }
      return rows;
    } finally {
      statement.free();
    }
  }
}

class BrowserAffinityDb implements AffinityDb {
  constructor(private readonly db: SqlJsDatabase) {}

  exec(sql: string): void {
    this.db.run(sql);
  }

  prepare(sql: string): AffinityStatement {
    return new BrowserAffinityStatement(this.db, sql);
  }

  close(): void {
    this.db.close();
  }
}

export async function openBrowserAffinityDb(): Promise<AffinityDb> {
  const sqlJs = await loadSqlJs();
  return new BrowserAffinityDb(new sqlJs.Database());
}
