export interface AffinityRunResult {
  lastInsertRowid: number | bigint;
  changes?: number | bigint | undefined;
}

export interface AffinityStatement {
  run(...params: unknown[]): AffinityRunResult;
  get<TRecord = Record<string, unknown>>(
    ...params: unknown[]
  ): TRecord | undefined;
  all<TRecord = Record<string, unknown>>(...params: unknown[]): TRecord[];
}

/**
 * SQLite dependency injected into every affinity operation.
 */
export type AffinityDb = {
  exec(sql: string): void;
  prepare(sql: string): AffinityStatement;
  close(): void;
};
