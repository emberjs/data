# ⚠️ Decommissioned ⚠️ 

> [!WARNING]
> This package is no longer providing any code as of release version 5.5
> Posted on 4/25/2025

This package is no longer part of the EmberData/WarpDrive experience.

Previously it provided the reactivity integration for EmberData/WarpDrive to use Ember's reactivity
system. Agnostic reactivity primitives are now provided by @ember-data/store (and thus @warp-drive/core)
while ember specific configuration is provided by @warp-drive/ember.

If using the `ember-data` package, you can remove any references to this package, no other changes needed.
If using individual packages, ensure you have `@warp-drive/ember` installed and add the following line to
your `app.ts` file.

```ts
import '@warp-drive/ember/install';
```
