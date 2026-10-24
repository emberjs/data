---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/types/schema/concepts/types/Derivation.md
---

# &#x20;Derivation\<R = `unknown`, T = `unknown`, FM *extends* [`ObjectValue`](../../../json/raw/types/ObjectValue.md) | `null` = [`ObjectValue`](../../../json/raw/types/ObjectValue.md) | `null`>

```ts
type Derivation<R = unknown, T = unknown, FM extends ObjectValue | null = ObjectValue | null> = {
  ___(unique) Symbol($type): string;
} & (record: R, options: FM, prop: string) => T;
```

Defined in: [warp-drive-packages/core/src/types/schema/concepts.ts:55](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/concepts.ts#L55)

A Derivation computes a read-only field value from other fields
(and options) on a record.

Derivations back DerivedField. They are memoized and only
recomputed when the fields they read change; derived values are never
stored in the cache nor sent to the server.

Derivations must be registered with the SchemaService via
`schema.registerDerivation(derivation)` before use, keyed by the
name assigned to their [Type](../../../symbols/variables/Type.md) property.

## Type Declaration

### \_\_\_(unique) Symbol($type)

```ts
___(unique) Symbol($type): string;
```

The unique name this derivation is registered under.

## Type Parameters

### R

`R` = `unknown`

### T

`T` = `unknown`

### FM

`FM` *extends* [`ObjectValue`](../../../json/raw/types/ObjectValue.md) | `null` = [`ObjectValue`](../../../json/raw/types/ObjectValue.md) | `null`
