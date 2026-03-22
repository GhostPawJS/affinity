import type { LinkState, RelationalLinkKind } from "../../links/types.ts";

/** Arguments for `write.seedSocialLink`. */
export interface SeedSocialLinkInput {
  fromContactId: number;
  toContactId: number;
  kind: RelationalLinkKind;
  role?: string | null;
  /** Defaults to `0` when omitted. */
  rank?: number;
  /** Defaults to `0.5` when omitted. */
  affinity?: number;
  /** Defaults to `0.5` when omitted. */
  trust?: number;
  /** Defaults to `active` when omitted. */
  state?: LinkState;
  cadenceDays?: number | null;
  bond?: string | null;
  now?: number;
}
