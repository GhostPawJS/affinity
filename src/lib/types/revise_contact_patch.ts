/** Allowed contact-intrinsic updates for `write.reviseContact`. */
export interface ReviseContactPatch {
  /** Opt-in outbound engagement block; defaults false. */
  doNotContact?: boolean;
  name?: string;
}
