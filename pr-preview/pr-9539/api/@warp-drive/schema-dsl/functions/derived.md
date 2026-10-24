---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@warp-drive/schema-dsl/functions/derived.md
description: >-
  Property decorator that compiles to a derived field, a read-only value
  computed by a registered derivation and never cached or sent to the server.
---

# &#x20;derived()&#x20;

```ts
function derived(options: DerivedOptions): (target: object, key: string) => void;
```

Defined in: [fields/derived.ts:65](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/schema-dsl/src/fields/derived.ts#L65)

**`Decorator`**

Marks a property as a [DerivedField](../../core/types/schema/fields/types/DerivedField.md) — a computed, read-only
value derived from other fields. Derived fields are never stored in the
cache and are never sent to the server.

## Parameters

### options

[`DerivedOptions`](../types/DerivedOptions.md)

## Returns

(`target`: `object`, `key`: `string`) => `void`

## Example

::: code-group

```ts [user.ts]
import { Resource, field, derived } from '@warp-drive/schema-dsl';

@Resource
export class User {
  @field declare firstName: string;
  @field declare lastName: string;
  @derived({ type: '@concat' }) declare displayName: string;
}
```

```json [compiled fields (excerpt)]
[
  { "kind": "derived", "name": "displayName", "type": "@concat" }
]
```

:::
