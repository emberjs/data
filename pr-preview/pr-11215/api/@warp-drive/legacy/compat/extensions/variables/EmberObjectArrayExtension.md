---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/legacy/compat/extensions/variables/EmberObjectArrayExtension.md
description: >-
  Legacy schema extension that gives reactive arrays the classic `EmberObject`
  API such as `get`, `set`, and observers, to ease migration from Ember objects.
---

&#x20;

# &#x20;EmberObjectArrayExtension

```ts
const EmberObjectArrayExtension: CAUTION_MEGA_DANGER_ZONE_Extension;
```

Defined in: [warp-drive-packages/legacy/src/compat/extensions.ts:91](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/legacy/src/compat/extensions.ts#L91)

A schema extension that adds the classic `EmberObject` API (`get`, `set`,
`getProperties`, `setProperties`, `incrementProperty`, `decrementProperty`,
`toggleProperty`, `notifyPropertyChange`, `addObserver`, `removeObserver`)
to reactive array resources.
