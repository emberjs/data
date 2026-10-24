---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/api/@warp-drive/legacy/compat/extensions/variables/EmberObjectArrayExtension.md
description: >-
  Legacy schema extension that gives reactive arrays the classic `EmberObject`
  API such as `get`, `set`, and observers, to ease migration from Ember objects.
---

&#x20;

# &#x20;EmberObjectArrayExtension

```ts
const EmberObjectArrayExtension: CAUTION_MEGA_DANGER_ZONE_Extension;
```

Defined in: [warp-drive-packages/legacy/src/compat/extensions.ts:91](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/legacy/src/compat/extensions.ts#L91)

A schema extension that adds the classic `EmberObject` API (`get`, `set`,
`getProperties`, `setProperties`, `incrementProperty`, `decrementProperty`,
`toggleProperty`, `notifyPropertyChange`, `addObserver`, `removeObserver`)
to reactive array resources.
