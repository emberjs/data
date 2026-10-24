---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/build-config/deprecations/variables/DEPRECATE_NON_STRICT_TYPES.md
---

# &#x20;DEPRECATE\_NON\_STRICT\_TYPES&#x20;

```ts
const DEPRECATE_NON_STRICT_TYPES: boolean = true;
```

Defined in: [deprecations.ts:162](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/build-config/src/deprecations.ts#L162)

Currently, ***Warp*Drive** expects that the `type` property associated with
a resource follows several conventions.

* The `type` property must be a non-empty string
* The `type` property must be singular
* The `type` property must be dasherized

We are deprecating support for types that do not match this pattern
in order to unlock future improvements in which we can support `type`
being any string of your choosing.

The goal is that in the future, you will be able to use any string
so long as it matches what your configured cache, identifier generation,
and schemas expect.

E.G. It will matter not that your string is in a specific format like
singular, dasherized, etc. so long as everywhere you refer to the type
you use the same string.

If using @warp-drive/legacy/model, there will always be a restriction that the
`type` must match the path on disk where the model is defined.

e.g. `app/models/foo/bar-bem.js` must have a type of `foo/bar-bem`

## Until

6.0
