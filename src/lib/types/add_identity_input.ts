/** Arguments for `write.addIdentity`. */
export interface AddIdentityInput {
  type: string;
  value: string;
  label?: string | null;
  /** When true, row is inserted with `verified` set (provenance only). */
  verified?: boolean;
  now?: number;
}
