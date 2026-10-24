---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/schema-dsl/functions/hash.md
description: >-
  Property decorator that compiles to the hash field an object schema uses as
  its identity, computed by a registered hash function.
---

# &#x20;hash()&#x20;

```ts
function hash(options: HashOptions): (target: object, key: string) => void;
```

Defined in: [fields/hash.ts:56](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/schema-dsl/src/fields/hash.ts#L56)

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
