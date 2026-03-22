/** Options for `write.reviseDateAnchor`. */
export interface ReviseDateAnchorOptions {
  now?: number;
  /** When true, skip duplicate calendar+target checks after applying the patch. */
  force?: boolean;
}
