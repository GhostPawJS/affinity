/**
 * Identity channel label (email, phone, handle, …) — stored as opaque string in SQL.
 * Normalization happens in write paths, not in DDL.
 */
export type IdentityType = string;
