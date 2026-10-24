---
url: /pr-preview/pr-11154/guides/the-manual/schemas/transformations.md
---
# Transformations

Transformations define how a single field's value is converted between its raw form in cache and the value your app reads or writes. When you read a transformed field, `hydrate` runs to produce the app value. When you write to it, `serialize` runs to produce the value stored in cache.

The raw cache value is what gets serialized to the API. The hydrated value is what your code works with.

::: info

* **Two-way** — converts on read (`hydrate`) and on write (`serialize`)
* **Per-field** — applies to one field at a time
* **Synchronous** — must return a value immediately
  :::

## When To Use A Transformation

Transformations work best when:

* **`The API shape differs from the app shape`**

  The most common case. Your API returns a numeric value as a string, a date as an ISO string, or a flag as an integer — but your app code wants a `number`, a `Date`, or a `boolean`. A transformation handles that conversion in one place.

* **`The conversion applies consistently to that field`**

  If every read and write of a field should go through the same conversion, define it once as a transformation and reference it in the schema rather than repeating the conversion at every call site.

* **`You need to write back to the field`**

  Transformations are two-way. If you need to set the field and have the value automatically serialized back to the cache's expected shape, a transformation is the right tool.

## When Not To Use A Transformation

* **`The value depends on other fields`**

  With limited exceptions, Transformations should operate on a single field in isolation. If the converted value requires reading other fields on the record, use a [derivation](./derivations.md) instead.

* **`The value is read-only`**

  If you only need a computed view of data and will never write to the field, a derivation is simpler — it has no `serialize` step and can combine multiple fields.

* **`The conversion is async`**

  Transformations must return synchronously. If the conversion requires a promise or async operation, it cannot be modeled as a transformation.

## A Complete Example

Here is how a transformation flows from definition to use:

::: code-group

```ts [transformations/float.ts]
import type { ReactiveResource, Transformation } from '@warp-drive/core/reactive';
import type { ResourceKey } from '@warp-drive/core/types';
import { Type } from '@warp-drive/core/types/symbols';

export const FloatTransform: Transformation<string | number, number> = {
  hydrate(value: string | undefined, options: { precision?: number } | null, _record: ReactiveResource): number { // [!code highlight]
    if (value === undefined || value === null) return 0;
    return Number(value);
  },

  serialize(value: string | number, options: { precision?: number } | null, _record: ReactiveResource): string { // [!code highlight]
    return typeof value === 'number'
      ? value.toFixed(options?.precision ?? 3)
      : Number(value).toFixed(options?.precision ?? 3);
  },

  defaultValue(options: { precision?: number } | null, _identifier: ResourceKey): string {
    return (0).toFixed(options?.precision ?? 3);
  },

  [Type]: 'float', // [!code highlight]
};
```

```ts [store.ts]
import { useRecommendedStore } from '@warp-drive/core';
import { JSONAPICache } from '@warp-drive/json-api';
import { FloatTransform } from './transformations/float';

const Store = useRecommendedStore({
  cache: JSONAPICache,
  transformations: [
    FloatTransform, // [!code highlight]
  ],
});
type Store = InstanceType<typeof Store>;

export { Store };
```

```ts [schemas/user.ts]
import { withDefaults } from '@warp-drive/core/reactive';

export const UserSchema = withDefaults({
  type: 'user',
  fields: [
    { name: 'name', kind: 'field' },
    { name: 'rank',     kind: 'field', type: 'float', options: { precision: 0 } }, // [!code highlight]
    { name: 'netWorth', kind: 'field', type: 'float', options: { precision: 2 } }, // [!code highlight]
  ],
});
```

```ts [usage]
const user = store.peekRecord('user', '1');
// cache holds: { rank: '1', netWorth: '1000000.01' }

user.rank;     // → 1         (number, via hydrate)
user.netWorth; // → 1000000.01 (number, via hydrate)

user.netWorth = 2_500_000.005;
// cache now holds: { netWorth: '2500000.01' } (string, via serialize)
```

:::

The `type` field in the schema entry matches the `[Type]` symbol on the transformation object — just as with derivations.

::: tip Registering without `useRecommendedStore`
If you're not using `useRecommendedStore`, register transformations imperatively before any schema that references them is registered:

```ts
import { PriceTransform } from './transformations/price';
store.schema.registerTransformation(PriceTransform);
```

See [`SchemaService.registerTransformation`](https://api.warp-drive.io/interfaces/SchemaService.html#registertransformation) in the API reference.
:::

## Two-Way Conversion

The full round-trip for a transformed field:

```
API / cache             hydrate →            app code
"1000000.01"    ─────────────────────────→   1_000_000.01
                ←─────────────────────────
                         serialize
```

`defaultValue` is optional. When provided, it supplies the raw cache default for a field that is missing from the API response. It receives the field's `options` and the resource identifier, and must return a value in the **cache shape** (i.e., what `hydrate` expects as input).

## Behavior Notes

* If a field references an unregistered transformation, reading that field throws in development.
* Transformations run synchronously on every read and write — keep them fast and pure.
* Avoid side effects, mutations, or service calls inside a transformation.

## Transformation vs Derivation

| | Transformation | Derivation |
|---|---|---|
| **Input** | A single field's raw cache value | One or more fields on the record |
| **Settable?** | Yes — two-way | No — read-only |
| **Stored in cache?** | Yes (as raw value) | No |
| **Use when** | Converting a field's type or shape | Computing or combining values |

See [Derivations](./derivations.md) for computed field behavior.
