import { AffinityValidationError } from "../errors/affinity_validation_error.ts";
import type { AffinityListReadOptions } from "../types/read_list_options.ts";

export function assertDefaultOrdering(
  _readName: string,
  options?: AffinityListReadOptions,
): void {
  if (options?.sort !== undefined || options?.descending !== undefined) {
    throw new AffinityValidationError(
      "This review does not support custom sort ordering",
    );
  }
}
