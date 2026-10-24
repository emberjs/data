---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/guides/the-manual/schemas/derivations.md
description: >-
  Define memoized read-only `derived` fields, register the derivation function
  by its `Type` key on the store, and spot when relational or optional data
  makes it the wrong tool.
---

# Derivations

Derivations are computed, read-only fields on a resource. When a derived field is accessed, the runtime looks up a registered function by name and calls it with the ReactiveResource and any configured options. The result is memoized — subsequent reads return the cached value without recomputation until one of the reactive fields the derivation read has changed.

The computed result is never stored in cache and is never serialized.

::: info

* **Lazy** — computed on access, not upfront
* **Memoized** — cached until a reactive dependency changes
* **Read-only** — derived fields cannot be set
  :::

## When To Use A Derivation

Derivations work best when the computation is:

* **`Simple and synchronous`**

Derivations must return a value immediately. Any calculation that requires async work — fetching data, awaiting promises, or triggering a request — is not a good fit.

* **`Based on fields that are always loaded`**

Because a derivation runs whenever the field is accessed, it must be safe to compute at any point. If the fields it depends on might not be present (e.g., they are optional includes from an API), the derivation could silently produce incorrect results.

* **`Widely useful across the application`**

Derivations are defined at the schema level and available everywhere a resource instance is used. Good candidates include formatting helpers (`fullName` from `firstName` and `lastName`), stable computed flags, and display-oriented calculations that every component consuming the record would otherwise repeat.

Since derivations may return any kind of value including functions they can be used to define anything imaginable including additional methods.

## When Not To Use A Derivation

Derivations are the **wrong tool** when the computation depends on data that may not be loaded or that requires a specific network context to be correct.

* **`Avoid relational data`**

If the calculation requires accessing a `belongsTo`, `hasMany`, or any other relationship, the related records may not have been fetched. A derivation has no way to trigger a load and no way to signal that its result is incomplete — it will silently return a stale or incorrect value. This is especially true for async relationships and collection relationships (hasMany), where the data set itself is not guaranteed to be fully present.

* **`Avoid conditionally-loaded fields`**

APIs commonly return different field sets depending on the request (sparse fieldsets, optional includes, role-based responses). If a derivation reads a field that is only present in some responses, it will produce incorrect results whenever that field is absent — with no warning.

### What To Do Instead

**Use a `<Request />` boundary.** Calculations that require a particular "view" of the data — a specific set of relationships loaded, a specific set of fields included — belong inside a component or utility that makes an explicit request for that data. A `<Request />` component (or equivalent data-fetching boundary) guarantees what was loaded and makes it safe to derive values from that data within its scope. This keeps correctness coupled to the data contract of the request rather than silently relying on ambient cache state.

In short: if you would need to say *"this derivation is only correct after calling X endpoint"*, it should not be a derivation — it should be a computed value defined inside the boundary that makes that request.

## A Complete Example

Here is how a derivation flows from definition to use. All four pieces are needed:

::: code-group

```ts [derivations/concat.ts]
import type { ReactiveResource } from '@warp-drive/core/reactive';
import { Type } from '@warp-drive/core/types/symbols';

export function concat(
  record: ReactiveResource & { [key: string]: unknown },
  options: Record<string, unknown> | null,
  _prop: string
): string {
  if (!options) throw new Error('options is required');
  const opts = options as { fields: string[]; separator?: string };
  return opts.fields.map((field) => record[field]).join(opts.separator ?? '');
}
concat[Type] = 'concat'; // [!code highlight]
```

```ts [store.ts]
import { useRecommendedStore } from '@warp-drive/core';
import { JSONAPICache } from '@warp-drive/json-api';
import { concat } from './derivations/concat';

const Store = useRecommendedStore({
  cache: JSONAPICache,
  derivations: [
    concat // [!code highlight]
  ]
});
type Store = InstanceType<typeof Store>;

export { Store }
```

```ts [schemas/user.ts]
import { withDefaults } from '@warp-drive/core/reactive';
import { Type } from '@warp-drive/core/types/symbols';

export const UserSchema = withDefaults({
  type: 'user',
  fields: [
    { name: 'firstName', kind: 'field' },
    { name: 'lastName', kind: 'field' },
    {
      name: 'fullName',
      kind: 'derived', // [!code highlight]
      type: 'concat',  // matches concat[Type] = 'concat' // [!code highlight]
      options: { fields: ['firstName', 'lastName'], separator: ' ' }, // [!code highlight]
    },
  ],
});

export interface User {
  readonly id: string;
  readonly $type: 'user';
  firstName: string;
  lastName: string;
  readonly fullName: string; // [!code highlight]
  readonly [Type]: 'user';
}
```

```ts [usage]
const user = store.peekRecord<User>('user', '1');

user.fullName; // → 'Rey Skybarker'  (computed lazily on first access)
user.fullName; // → 'Rey Skybarker'  (memoized, no recomputation)

user.firstName = 'Finn';
user.fullName; // → 'Finn Skybarker' (recomputed because firstName changed)
```

:::

The `type` field in the schema entry is how the runtime looks up the registered function. The `[Type]` symbol property on the function is what `registerDerivation` uses as the lookup key — they must match.

## Read-Only by Design

Derived fields cannot be assigned. Attempting to do so throws in development:

```ts
user.fullName = 'Leia Organa'; // [!code error]
// Error: Cannot set derived field 'fullName'
```

This is intentional — derivations represent computed state, not stored state. If you need a value that can be both read and written with a different shape, use a [transformation](./transformations.md) instead.

## Reactivity and Memoization

Derivations are dependency-tracked: they only re-run when the specific fields they accessed have changed.

```ts
user.firstName = 'Finn'; // fullName recomputes on next access    // [!code ++]
user.age = 30;           // fullName does NOT recompute            // [!code --]
```

This tracking is automatic — you do not declare dependencies. The derivation runs inside a reactive context, and every reactive field accessed during that run is registered as a dependency. Change an unrelated field, and the derivation is untouched.

A derivation that has never been accessed costs nothing. It is only run on first access, and only re-run when read *after* a dependency changes.

## About Built-in Derivations

`withDefaults` adds a few built-in derived fields to every schema it configures. The most notable is `@identity`, which surfaces the resource's identity — its `id`, `lid`, and `type` — as readable fields on the record.

These are registered automatically when using the recommended store setup. If you are composing a custom store, call `registerDerivations` to wire them in:

```ts [store/index.ts]
import { registerDerivations, SchemaService } from '@warp-drive/core/reactive';

const schema = new SchemaService();
registerDerivations(schema); // [!code highlight]
```

## Derivation vs Transformation

| | Derivation | Transformation |
|---|---|---|
| **Input** | One or more fields on the record | A single field's raw cache value |
| **Settable?** | No — read-only | Yes — two-way |
| **Stored in cache?** | No | Yes (as raw value) |
| **Use when** | Computing or combining values | Converting a field's type or shape |

See [Transformations](./transformations.md) for single-field conversion.
