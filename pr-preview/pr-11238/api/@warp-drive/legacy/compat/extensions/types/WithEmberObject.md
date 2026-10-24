---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/api/@warp-drive/legacy/compat/extensions/types/WithEmberObject.md
description: >-
  Legacy type that adds the classic `EmberObject` methods to a reactive resource
  type using `EmberObjectExtension` or `EmberObjectArrayExtension`.
---

&#x20;

# &#x20;WithEmberObject\<T>

```ts
type WithEmberObject<T> = T & Pick<T & EmberObject, ArrayType<typeof EmberObjectMethods>>;
```

Defined in: [warp-drive-packages/legacy/src/compat/extensions.ts:401](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/legacy/src/compat/extensions.ts#L401)

Adds the classic `EmberObject` API (as registered by [EmberObjectExtension](../variables/EmberObjectExtension.md)/
[EmberObjectArrayExtension](../variables/EmberObjectArrayExtension.md)) to the type of a reactive resource.

## Type Parameters

### T

`T`
