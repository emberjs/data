---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11142/api/@warp-drive/legacy/model-fragments/variables/modelFor.md
description: >-
  Legacy `store.modelFor` fallback that returns a schema-backed `ShimModelClass`
  for a type when ModelFragments support is on and no `Model` class exists.
---

&#x20;

# &#x20;modelFor

```ts
const modelFor: typeof fragmentsModelFor = fragmentsModelFor;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/hooks/model-for.ts:142](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/legacy/src/model-fragments/hooks/model-for.ts#L142)

The `modelFor` fallback used to construct a `ShimModelClass` schema for a
type when ModelFragments support is enabled and no real `Model` subclass
is registered for that type.
