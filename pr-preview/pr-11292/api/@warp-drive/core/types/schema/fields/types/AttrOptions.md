---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/types/schema/fields/types/AttrOptions.md
---

# &#x20;AttrOptions

```ts
interface AttrOptions {
  [key: string]: 
  | Value
  | (() => Value)
  | undefined;
  defaultValue?: 
  | PrimitiveValue
  | (() => Value);
}
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:10](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/schema/fields.ts#L10)

Options signature for Legacy Attributes.

## Indexable

```ts
[key: string]: 
  | Value
  | (() => Value)
  | undefined
```

## Properties

### defaultValue?

```ts
optional defaultValue?: 
  | PrimitiveValue
  | (() => Value);
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:14](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/schema/fields.ts#L14)

A primitive value or a function which produces a value.
