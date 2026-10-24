---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/schema-dsl/functions/hash.md
---

# &#x20;hash()&#x20;

```ts
function hash(options: HashOptions): (target: object, key: string) => void;
```

Defined in: [fields/hash.ts:52](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/schema-dsl/src/fields/hash.ts#L52)

**`Decorator`**

Marks a property as the [HashField](../../core/types/schema/fields/types/HashField.md) used to compute the identity of
an [ObjectSchema](ObjectSchema.md). At most one property per object schema may use
this decorator, and doing so becomes that schema's `identity`.

## Parameters

### options

[`HashOptions`](../types/HashOptions.md)

## Returns

(`target`: `object`, `key`: `string`) => `void`

## Example

::: code-group

```ts [address.ts]
import { ObjectSchema, hash, field } from '@warp-drive/schema-dsl';

@ObjectSchema
export class Address {
  @hash({ type: 'address-hash' }) declare addressHash: string;
  @field declare street: string;
}
```

```json [compiled schema (excerpt)]
{
  "type": "address",
  "identity": { "kind": "@hash", "name": "addressHash", "type": "address-hash" }
}
```

:::
