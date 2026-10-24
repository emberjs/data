---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/reactive/variables/fromIdentity.md
---

# &#x20;fromIdentity

```ts
const fromIdentity: FromIdentityDerivation;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:481](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/reactive/-private/schema.ts#L481)

A derivation that computes its value from the
record's identity.

It can be used via a derived field definition like:

```ts
{
  kind: 'derived',
  name: 'id',
  type: '@identity',
  options: { key: 'id' }
}
```

Valid keys are `'id'`, `'lid'`, `'type'`, and `'^'`.

`^` returns the entire identifier object.
