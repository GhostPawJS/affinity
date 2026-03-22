/** Allowed updates for `write.reviseIdentity`. */
export interface ReviseIdentityPatch {
  type?: string;
  value?: string;
  label?: string | null;
}
