/** The complete link row projection, optionally qualified for joined queries. */
export function linkColumns(alias?: string): string {
  const columns =
    "id from_contact_id to_contact_id kind role is_structural rank affinity trust state cadence_days pinned_cadence_days bond created_at updated_at removed_at".split(
      " ",
    );
  return columns
    .map((column) => (alias ? `${alias}.${column}` : column))
    .join(", ");
}
