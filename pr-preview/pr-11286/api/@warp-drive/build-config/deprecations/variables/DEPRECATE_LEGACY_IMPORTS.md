---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/build-config/deprecations/variables/DEPRECATE_LEGACY_IMPORTS.md
---

# &#x20;DEPRECATE\_LEGACY\_IMPORTS&#x20;

```ts
const DEPRECATE_LEGACY_IMPORTS: boolean = true;
```

Defined in: [deprecations.ts:203](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/build-config/src/deprecations.ts#L203)

Deprecates when importing from `ember-data/*` instead of `@ember-data/*`
in order to prepare for the eventual removal of the legacy `ember-data/*`

All imports from `ember-data/*` should be updated to `@ember-data/*`
except for `ember-data/store`. When you are using `ember-data` (as opposed to
installing the indivudal packages) you should import from `ember-data/store`
instead of `@ember-data/store` in order to receive the appropriate configuration
of defaults.

## Until

6.0
