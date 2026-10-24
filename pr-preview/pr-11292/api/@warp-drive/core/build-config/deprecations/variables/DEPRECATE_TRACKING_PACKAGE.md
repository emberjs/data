---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/build-config/deprecations/variables/DEPRECATE_TRACKING_PACKAGE.md
---

# &#x20;DEPRECATE\_TRACKING\_PACKAGE&#x20;

```ts
const DEPRECATE_TRACKING_PACKAGE: boolean;
```

Defined in: [node\_modules/.pnpm/@warp-d\_25f56f2729dd79700790d78740333f27/node\_modules/@warp-drive/build-config/dist/deprecations.d.ts:501](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_25f56f2729dd79700790d78740333f27/node_modules/@warp-drive/build-config/dist/deprecations.d.ts#L501)

Deprecates the use of the @ember-data/tracking package which
historically provided bindings into Ember's reactivity system.

This package is no longer needed as the configuration is now
provided by the @warp-drive/ember package.

This deprecation can be resolved by removing the
@ember-data/tracking package from your project and ensuring
that your app.js file has the following import:

```js
import '@warp-drive/ember/install';
```

Once this import is present, you can remove the deprecation
by setting the deprecation to `false` in your build config:

```js
// inside of ember-cli-build.js

const { setConfig } = await import('@warp-drive/build-config');

setConfig(app, __dirname, {
  deprecations: {
    DEPRECATE_TRACKING_PACKAGE: false
  }
});
```

## Until

6.0
