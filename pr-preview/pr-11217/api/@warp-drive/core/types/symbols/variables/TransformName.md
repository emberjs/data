---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11217/api/@warp-drive/core/types/symbols/variables/TransformName.md
description: >-
  Alias of the `Type` symbol that a legacy transform can declare so
  `attr<Transform>('name')` checks the transform name at the type level.
---

# &#x20;TransformName

```ts
const TransformName: "___(unique) Symbol($type)" = Type;
```

Defined in: [warp-drive-packages/core/src/types/symbols.ts:97](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/symbols.ts#L97)

Symbol for the name of a transform.

This is an optional feature that can be used by
transform implementations to provide a typescript
hint for the name of the transform.

If not used, `attr<Transform>('name')` will
allow any string name. `attr('name')` will always
allow any string name.

If used, `attr<Transform>('name')` will enforce
that the name is the same as the transform name.
