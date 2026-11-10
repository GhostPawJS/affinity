# Adopt Affinity

1. Initialize the database, then create the owner before events:
   `ghostpaw-affinity contact create '{"name":"Desk bot","kind":"agent"}' --bootstrap-owner --json | jq .id`.
   Tool: `manage_contact`, `action:"create"`, `input:{name:"Desk bot",kind:"agent",bootstrapOwner:true}`.
2. Search before creating other contacts; attach verified identities.
3. Record events once the owner exists. Contact creation JSON has `.id`;
   `.entities[] | select(.kind == "contact") | .id` still works in jq.
4. Set `doNotContact:true` on create/revise for contacts who must not be engaged.
   Outbound recording requires the explicit `overrideDoNotContact:true` field
   (CLI `--override-do-not-contact`) when blocked.
