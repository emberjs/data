---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/core/types/schema/concepts/types/Derivation.md
description: >-
  A registered function that computes a memoized, read-only field value from a
  record's other fields, backing `derived` fields.
---

# &#x20;Derivation\<R = `unknown`, T = `unknown`, FM *extends* [`ObjectValue`](../../../json/raw/types/ObjectValue.md) | `null` = [`ObjectValue`](../../../json/raw/types/ObjectValue.md) | `null`>

```ts
type Derivation<R = unknown, T = unknown, FM extends ObjectValue | null = ObjectValue | null> = {
  ___(unique) Symbol($type): string;
} & (record: R, options: FM, prop: string) => T;
```

Defined in: [warp-drive-packages/core/src/types/schema/concepts.ts:67](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/schema/concepts.ts#L67)

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
