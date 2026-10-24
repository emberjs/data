---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/schema-dsl/functions/alias.md
---

# &#x20;alias()&#x20;

```ts
function alias(options: AliasOptions): (target: object, key: string) => void;
```

Defined in: [fields/alias.ts:78](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/schema-dsl/src/fields/alias.ts#L78)

**`Decorator`**

Marks a property as an alias — compiling to a
[LegacyAliasField](../../core/types/schema/fields/types/LegacyAliasField.md), [PolarisAliasField](../../core/types/schema/fields/types/PolarisAliasField.md), or
[ObjectAliasField](../../core/types/schema/fields/types/ObjectAliasField.md) depending on the schema it's declared on
— that points to another field already present in the schema.

Unlike [derived](derived.md), an alias may write back to its source field when
the record is in an editable mode.

## Parameters

### options

[`AliasOptions`](../types/AliasOptions.md)

## Returns

(`target`: `object`, `key`: `string`) => `void`

## Example

::: code-group

```ts [product.ts]
import { Resource, field, alias } from '@warp-drive/schema-dsl';

@Resource
export class Product {
  @field({ sourceKey: 'product_name' }) declare name: string;
  @alias({ kind: 'field', name: 'name' }) declare productName: string;
}
```

```json [compiled fields (excerpt)]
[
  { "kind": "field", "name": "name", "sourceKey": "product_name" },
  { "kind": "alias", "name": "productName", "type": null, "options": { "kind": "field", "name": "name" } }
]
```

:::
