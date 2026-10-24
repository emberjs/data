---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/schema-dsl/types/AttributeOptions.md
---

# &#x20;AttributeOptions

```ts
interface AttributeOptions {
  sourceKey?: string;
  type?: string;
}
```

Defined in: [fields/attribute.ts:10](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/schema-dsl/src/fields/attribute.ts#L10)

Options accepted by the [attribute](../functions/attribute.md) decorator.

## Properties

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [fields/attribute.ts:18](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/schema-dsl/src/fields/attribute.ts#L18)

The name of the field as returned by the API, if it differs from the
decorated property's name. Compiles onto the
[LegacyAttributeField](../../core/types/schema/fields/types/LegacyAttributeField.md)'s `sourceKey`.

***

### type?

```ts
optional type?: string;
```

Defined in: [fields/attribute.ts:25](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/schema-dsl/src/fields/attribute.ts#L25)

The name of a legacy transform to compile onto the field's `type`.
