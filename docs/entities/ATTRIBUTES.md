# `attributes`

## What It Is

`attributes` is the operational metadata and preference layer for contacts and
links.

An attribute is a named key-value pair attached to either a contact or a link.
Attributes store anything that doesn't belong on the entity's intrinsic columns:
custom tags, preferences, configuration, and domain-specific metadata. A null
value represents tag/presence semantics ("this key exists") without an
associated payload.

## Why It Exists

Contacts and links have fixed intrinsic columns (`name`, `kind`, `rank`,
`trust`, etc.), but real-world relationship management produces unbounded
metadata: communication preferences, dietary restrictions, interests, link
nicknames, CRM tags, and so on.

Bolting extra nullable columns onto entity tables doesn't scale. A generic
key-value store with target exclusivity (exactly one of `contact_id` or
`link_id`) keeps the schema stable while giving callers full flexibility.

Beyond storage, the `pref.*` namespace feeds directly into the mechanics
pipeline. Preference-sensitive formulas use these keys to compute the
`preferenceMatch` multiplier that adjusts how events weigh on specific
relationships.

`attributes` exists so the system has:

- one place for "what do I know or care about regarding this entity?"
- structured preference data that flows into formulas without coupling
- tag/presence semantics alongside string-valued metadata
- clean separation from intrinsic entity fields

## How To Use It

Attach attributes to contacts or links:

1. `write.setAttribute(db, { contactId }, "location.city", "London")` —
   contact-targeted attribute.
2. `write.setAttribute(db, { linkId }, "pref.channel.text", null)` —
   link-targeted preference (null = tag-present).
3. `write.unsetAttribute(db, { contactId }, "location.city")` — remove one.
4. `write.replaceAttributes(db, { contactId }, entries)` — replace the full
   visible set.

Attributes are surfaced in `read.getContactProfile()` as part of the profile
record. They are not independently queryable — attributes exist to annotate
entities, not to serve as a standalone query surface.

## Good Uses

- communication preferences: `pref.channel.text`, `pref.channel.email`
- activity preferences: `pref.activity.walk`, `pref.activity.coffee`
- link-specific preferences: `pref.link.channel.email`
- location metadata: `location.city`, `location.timezone`
- tags and labels: `tag.vip`, `tag.family-circle`
- dietary or lifestyle notes: `dietary.vegetarian`
- CRM-style fields: `company.role`, `company.department`

## Do Not Use It For

- the contact's name or kind — those are intrinsic contact columns
- relationship state or progression — that belongs in [`links`](LINKS.md)
- identity handles — that belongs in [`identities`](IDENTITIES.md)
- evidence records — that belongs in [`events`](EVENTS.md)

Attributes answer "what do I know about this entity?" — not "who are they?",
"how do we relate?", or "what happened?"

## Target Exclusivity

Every attribute row targets exactly one of `contact_id` or `link_id`. Both
cannot be set simultaneously, and neither can be null. This is an enforced
invariant, not a convention.

Contact-targeted attributes describe the contact itself ("Alice prefers text
messages"). Link-targeted attributes describe the relationship ("the Alice link
prefers email for scheduling").

## The `pref.*` Namespace

Keys beginning with `pref.` are semantically special. The mechanics pipeline
reads them during `preferenceMatch` computation:

```
preferenceMatch = clamp(1.0 + 0.12 * liked_matches - 0.15 * disliked_matches, 0.75, 1.25)
```

The preference match formula works by extracting tags from event `provenance`
and the event type, then counting how many match liked vs. disliked preferences
from the contact's and link's `pref.*` attributes.

This means `pref.*` attributes have real mechanical weight — setting
`pref.channel.text` on a contact will cause text-message interactions to score
slightly higher for that contact's relationships.

## Null Value Semantics

When `value` is null, the attribute functions as a tag or flag: "this key is
present." This is useful for binary preferences (`pref.activity.walk` = "likes
walking") and categorical labels (`tag.vip` = "is a VIP").

When `value` is a non-null string, it carries explicit data:
`location.city = "London"`.

## Related Tables

- [`contacts`](CONTACTS.md): contact-targeted attributes annotate contacts
- [`links`](LINKS.md): link-targeted attributes annotate relationships
- [`merges`](MERGES.md): merge operations rewire contact-targeted attributes
  to the winner

## Public APIs

### Writes

- `write.setAttribute(db, target, name, value)`: set one attribute. Target is
  `{ contactId }` or `{ linkId }`. The name is a freeform namespaced string.
  Value is a string or null.
- `write.unsetAttribute(db, target, name)`: remove one attribute by name.
- `write.replaceAttributes(db, target, entries)`: replace the full visible
  attribute set for a target. Entries not included in the replacement set are
  removed.

### Reads

There is no dedicated attribute read surface. Attributes are surfaced through:

- `read.getContactProfile(db, contactId)` — includes the full `attributes`
  array for the contact
- `read.getOwnerProfile(db)` — includes the owner's attributes
- `read.getLinkDetail(db, linkId)` — includes the link's attributes

Internally, `pref.*` attributes are consumed by the preference match formula
during evidence processing. This is transparent to callers — the system reads
preferences as part of mechanics, not as a query API.
