---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/utilities/derivations/variables/concat.md
description: >-
  Derivation registered as `concat` that joins a record's listed `fields` into
  one string with an optional `separator`.
---

# &#x20;concat

```ts
const concat: ConcatDerivation;
```

Defined in: [derivations.ts:37](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/utilities/src/derivations.ts#L37)

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
