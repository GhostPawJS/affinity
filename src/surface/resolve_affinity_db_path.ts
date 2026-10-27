import { homedir } from "node:os";
import { join, resolve } from "node:path";

export function resolveAffinityDbPath(
  options: { flag?: string; env?: Record<string, string | undefined> } = {},
): string {
  const path =
    options.flag ??
    ((options.env ?? process.env).GHOSTPAW_AFFINITY_DB ||
      join(homedir(), ".ghostpaw", "affinity.db"));
  return path === ":memory:" ? path : resolve(path);
}
