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

## Hard do-not-contact

Set the native `doNotContact` flag on the person or organisation. Run the check before every outbound action and proceed only on exit 0. Active outgoing `works_at` and `member_of` ties propagate the flag transitively. A blocked contact exits 1.

```sh
ghostpaw-affinity check contactable --contact '{"contactId":8}' --json
```

For older databases using a `do_not_contact` attribute, set the native flag with `contact revise '{"contactId":8}' --patch '{"doNotContact":true}'` on each flagged contact.
