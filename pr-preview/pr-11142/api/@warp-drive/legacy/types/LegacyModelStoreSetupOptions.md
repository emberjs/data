---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11142/api/@warp-drive/legacy/types/LegacyModelStoreSetupOptions.md
description: >-
  `useLegacyStore` options for a store that uses `Model` in `linksMode`, without
  the legacy adapter and serializer network layer.
---

&#x20;

# &#x20;LegacyModelStoreSetupOptions\<T *extends* `Cache`>

```ts
interface LegacyModelStoreSetupOptions<T extends Cache> extends _LegacyStoreSetupOptions<T> {
  legacyRequests?: false;
  linksMode: true;
  modelFragments?: boolean;
  schemas?: (
  | ResourceSchema
  | ObjectSchema)[];
}
```

Defined in: [warp-drive-packages/legacy/src/index.ts:75](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/legacy/src/index.ts#L75)

Setup options for a legacy store configured to use `Model` with `linksMode`
enabled, meaning no legacy adapter/serializer request infrastructure is required.

## Extends

* `_LegacyStoreSetupOptions`<`T`>

## Type Parameters

### T

`T` *extends* `Cache`

## Properties

### legacyRequests?

```ts
optional legacyRequests?: false;
```

Defined in: [warp-drive-packages/legacy/src/index.ts:93](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/legacy/src/index.ts#L93)

if true, all legacy request methods and supporting infrastructure will
be available on the store.

If legacyRequests is true, [linksMode](#linksmode) must be false

#### Default

```ts
false
```

***

### linksMode

```ts
linksMode: true;
```

Defined in: [warp-drive-packages/legacy/src/index.ts:84](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/legacy/src/index.ts#L84)

If true, it is presumed that no requests require use of the LegacyNetworkHandler
and associated adapters/serializer methods.

If legacyRequests is true, [linksMode](#linksmode) must be false

#### Default

```ts
false
```

***

### modelFragments?

```ts
optional modelFragments?: boolean;
```

Defined in: [warp-drive-packages/legacy/src/index.ts:64](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/legacy/src/index.ts#L64)

Whether to include support for ModelFragments migrations.

#### Default

```ts
false
```

#### Inherited from

```ts
_LegacyStoreSetupOptions.modelFragments
```

***

### schemas?

```ts
optional schemas?: (
  | ResourceSchema
  | ObjectSchema)[];
```

Defined in: [warp-drive-packages/legacy/src/index.ts:57](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/legacy/src/index.ts#L57)

The [ResourceSchemas](../../core/types/schema/fields/types/ResourceSchema.md) or [ObjectSchemas](../../core/types/schema/fields/types/ObjectSchema.md) of entities
migrated to no longer use [Model](../model/classes/Model.md).

:::caution
[Model](../model/classes/Model.md) is still able to be used directly as a source of schema when using [useLegacyStore](../functions/useLegacyStore.md),
however, its reliance on EmberObject, classic computeds and resolver behaviors mean that Model
will stop working when these things are deprecated in Ember.
:::

#### Inherited from

```ts
_LegacyStoreSetupOptions.schemas
```
