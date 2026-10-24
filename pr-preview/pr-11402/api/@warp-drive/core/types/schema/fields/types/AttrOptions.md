---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11402/api/@warp-drive/core/types/schema/fields/types/AttrOptions.md
description: >-
  Options object on a legacy `attribute` field schema, holding a `defaultValue`
  (a primitive or a function producing one) plus any transform-specific options.
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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:22](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/types/schema/fields.ts#L22)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:26](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/types/schema/fields.ts#L26)

A primitive value or a function which produces a value.
