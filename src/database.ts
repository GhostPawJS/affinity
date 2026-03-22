import type { DatabaseSync } from "node:sqlite";

/**
 * SQLite dependency injected into every affinity operation.
 */
export type AffinityDb = DatabaseSync;
