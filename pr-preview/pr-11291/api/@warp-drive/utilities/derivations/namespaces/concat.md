---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/utilities/derivations/namespaces/concat.md
description: >-
  Derivation registered as `concat` that joins a record's listed `fields` into
  one string with an optional `separator`.
---

A derivation for use by ReactiveResource that joins the given fields
with the optional separator (or '' if no separator is provided).

Generally you should not need to import and use this function directly.

## Example

```ts
{
 *   name: 'fullName',
 *   kind: 'derived',
 *   type: 'concat',
 *   options: {
 *     fields: ['firstName', 'lastName'],
 *     separator: ' ',
 *   },
 * }
```
