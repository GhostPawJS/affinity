import type { AffinityDb } from "../database.ts";
import { rebuildUpcomingOccurrences as rebuildUpcomingOccurrencesInternal } from "../events/upcoming_occurrences.ts";

/**
 * Clears `upcoming_occurrences` and repopulates from all live `date_anchor` events.
 * Use after schema upgrades or to repair drift; requires `upcoming_occurrences` (see `initAffinityTables`).
 *
 * @returns Number of anchor events materialized.
 */
export function rebuildUpcomingOccurrences(
  db: AffinityDb,
  options?: { now?: number },
): number {
  return rebuildUpcomingOccurrencesInternal(db, options);
}
