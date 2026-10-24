---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/build-config/deprecations/variables/DEPRECATE_NON_STRICT_TYPES.md
---

# &#x20;DEPRECATE\_NON\_STRICT\_TYPES&#x20;

```ts
const DEPRECATE_NON_STRICT_TYPES: boolean;
```

Defined in: [node\_modules/.pnpm/@warp-d\_25f56f2729dd79700790d78740333f27/node\_modules/@warp-drive/build-config/dist/deprecations.d.ts:160](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/node_modules/.pnpm/@warp-d_25f56f2729dd79700790d78740333f27/node_modules/@warp-drive/build-config/dist/deprecations.d.ts#L160)

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
