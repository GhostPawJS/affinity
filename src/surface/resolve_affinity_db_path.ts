import { homedir } from "node:os";
import { join } from "node:path";

export function resolveAffinityDbPath(
  options: { flag?: string; env?: Record<string, string | undefined> } = {},
): string {
  return (
    options.flag ??
    ((options.env ?? process.env).GHOSTPAW_AFFINITY_DB ||
      join(homedir(), ".ghostpaw", "affinity.db"))
  );
}
