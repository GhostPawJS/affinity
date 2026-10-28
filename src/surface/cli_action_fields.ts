/** Fields consumed by each tool action; required fields are rendered in help only. */
export const cliActionFields: Record<string, Record<string, string[]>> = {
  manage_identity: {
    add: ["contact", "input"],
    revise: ["identityId", "patch"],
    verify: ["identityId", "verifiedAt"],
    remove: ["identityId", "removedAt"],
  },
  manage_commitment: {
    record: ["input"],
    resolve: ["commitmentEventId", "resolution", "options"],
  },
  manage_date_anchor: {
    add: ["input"],
    revise: ["anchorEventId", "patch", "options"],
    remove: ["anchorEventId", "removedAt"],
  },
  manage_attribute: {
    set: ["target", "name", "value"],
    unset: ["target", "name", "removedAt"],
    replace: ["target", "entries"],
  },
  manage_duplicate_dismissal: {
    dismiss: ["left", "right", "reason"],
    undismiss: ["left", "right"],
  },
  manage_relationship: {
    seed_social_link: ["from", "to", "kind", "role", "input", "options"],
    revise_bond: ["link", "bond", "options"],
    override_state: ["link", "state", "options"],
    set_structural_tie: ["from", "to", "kind", "role", "input", "options"],
    remove_structural_tie: ["link", "removedAt"],
  },
};
