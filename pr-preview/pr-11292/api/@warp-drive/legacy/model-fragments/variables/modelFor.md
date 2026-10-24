---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/legacy/model-fragments/variables/modelFor.md
---

&#x20;

# &#x20;modelFor

```ts
const modelFor: typeof fragmentsModelFor = fragmentsModelFor;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/hooks/model-for.ts:140](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model-fragments/hooks/model-for.ts#L140)

The `modelFor` fallback used to construct a `ShimModelClass` schema for a
type when ModelFragments support is enabled and no real `Model` subclass
is registered for that type.
