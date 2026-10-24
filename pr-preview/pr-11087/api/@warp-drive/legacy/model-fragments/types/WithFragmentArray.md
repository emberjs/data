---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/legacy/model-fragments/types/WithFragmentArray.md
---

&#x20;

# &#x20;WithFragmentArray\<T *extends* [`Fragment`](../classes/Fragment.md)>

```ts
type WithFragmentArray<T extends Fragment> = T & WithArrayLike<T> & FragmentArray<T>;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/index.ts:14](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/model-fragments/index.ts#L14)

Adds Ember's classic array-like API (via [WithArrayLike](../../compat/extensions/types/WithArrayLike.md)) and the
[FragmentArray](../classes/FragmentArray.md) API to the type of a migrated fragment-array resource.

## Type Parameters

### T

`T` *extends* [`Fragment`](../classes/Fragment.md)
