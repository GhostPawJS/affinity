import { AsyncLocalStorage } from "node:async_hooks";
import { AffinityValidationError } from "./errors/affinity_validation_error.ts";

const zones = new AsyncLocalStorage<string>();

export function validateTimeZone(zone: unknown): asserts zone is string {
  try {
    if (typeof zone !== "string" || !zone.trim()) throw new Error();
    new Intl.DateTimeFormat("en", { timeZone: zone }).format(0);
  } catch {
    throw new AffinityValidationError(
      `Invalid time zone: ${String(zone)}. Expected an IANA zone such as Europe/Berlin.`,
    );
  }
}

export function currentTimeZone(): string | undefined {
  const zone = zones.getStore() ?? process.env.TZ;
  if (zone !== undefined) validateTimeZone(zone);
  return zone;
}

export function withTimeZone<T>(zone: string, operation: () => T): T {
  validateTimeZone(zone);
  return zones.run(zone, operation);
}
