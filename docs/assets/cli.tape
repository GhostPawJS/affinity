# Re-record: PATH with ghostpaw-affinity 0.5.0 binary, then `vhs docs/assets/cli.tape`
Output docs/assets/cli.gif
Set Shell bash
Set FontSize 18
Set Width 1600
Set Height 700
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 15ms
Set WindowBar Colorful
Hide
Type "export PS1='affinity $ ' GHOSTPAW_AFFINITY_DB=$(mktemp -d)/affinity.db && clear"
Enter
Show
Type `ghostpaw-affinity --version`
Sleep 200ms
Enter
Sleep 900ms
Type `ghostpaw-affinity contact create '{"name":"Max","kind":"human","bootstrapOwner":true}'`
Sleep 200ms
Enter
Sleep 900ms
Type `ghostpaw-affinity contact create '{"name":"Jana Petersen","kind":"human"}'`
Sleep 200ms
Enter
Sleep 900ms
Type `ghostpaw-affinity attribute set --target '{"kind":"contact","contact":{"contactId":2}}' --name tag:gastro --value null`
Sleep 200ms
Enter
Sleep 900ms
Type `ghostpaw-affinity event record --kind interaction --input '{"type":"conversation","occurredAt":"-9d","summary":"Lunch about the café pilot","significance":6,"participants":[{"contactId":2,"role":"recipient","directionality":"mutual"}]}'`
Sleep 200ms
Enter
Sleep 900ms
Type `ghostpaw-affinity commitment record --input '{"commitmentType":"promise","occurredAt":"-9d","dueAt":"-2d","summary":"Send Jana the pilot proposal","significance":6,"participants":[{"contactId":2,"role":"recipient"}]}'`
Sleep 200ms
Enter
Sleep 900ms
Type `ghostpaw-affinity search "petersen gastro"`
Sleep 200ms
Enter
Sleep 900ms
Type `ghostpaw-affinity review commitments.open`
Sleep 200ms
Enter
Sleep 900ms
Type `ghostpaw-affinity review links.radar`
Sleep 200ms
Enter
Sleep 900ms
Sleep 2s
Screenshot docs/assets/cli.png
