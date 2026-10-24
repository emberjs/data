---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@warp-drive/schema-dsl/types/AttributeOptions.md
description: >-
  Options for the legacy `@attribute` decorator that set the compiled attribute
  field's `sourceKey` and legacy transform `type`.
---

# &#x20;AttributeOptions

```ts
interface AttributeOptions {
  sourceKey?: string;
  type?: string;
}
```

Defined in: [fields/attribute.ts:12](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/schema-dsl/src/fields/attribute.ts#L12)

Options accepted by the [attribute](../functions/attribute.md) decorator.

## Properties

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [fields/attribute.ts:20](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/schema-dsl/src/fields/attribute.ts#L20)

The name of the field as returned by the API, if it differs from the
decorated property's name. Compiles onto the
[LegacyAttributeField](../../core/types/schema/fields/types/LegacyAttributeField.md)'s `sourceKey`.

***

### type?

```ts
optional type?: string;
```

Defined in: [fields/attribute.ts:27](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/schema-dsl/src/fields/attribute.ts#L27)

The name of a legacy transform to compile onto the field's `type`.
