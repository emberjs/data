---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/api/@warp-drive/legacy/model-fragments/types/WithFragment.md
description: >-
  Legacy type for a reactive object migrated from a `ModelFragments` fragment,
  adding the `EmberObject` and `Fragment` APIs to it.
---

&#x20;

# &#x20;WithFragment\<T>

```ts
type WithFragment<T> = T & WithEmberObject<T> & Fragment;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/index.ts:12](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/legacy/src/model-fragments/index.ts#L12)

Adds the classic `EmberObject` API (via [WithEmberObject](../../compat/extensions/types/WithEmberObject.md)) and the
[Fragment](../classes/Fragment.md) API to the type of a migrated single-fragment resource.

## Type Parameters

### T

`T`
