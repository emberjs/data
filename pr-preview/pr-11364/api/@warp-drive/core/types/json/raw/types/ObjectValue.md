---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/core/types/json/raw/types/ObjectValue.md
description: A plain JSON object whose property values are all JSON values.
---

# &#x20;ObjectValue

```ts
interface ObjectValue {
  [key: string]: Value;
}
```

Defined in: [warp-drive-packages/core/src/types/json/raw.ts:20](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/json/raw.ts#L20)

A plain JSON object, whose values are themselves valid [Value](Value.md)s.

## Indexable

```ts
[key: string]: Value
```
