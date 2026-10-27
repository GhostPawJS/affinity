/** Options for `read.getContactProfile`. */
export interface ContactProfileReadOptions {
  /** Cap on relational links returned in `topLinks` (default 8). */
  recentEventsLimit?: number;
  now?: number;
  topLinksLimit?: number;
}
