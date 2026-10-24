---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/legacy/types/LegacyModelAndNetworkStoreSetupOptions.md
---

&#x20;

# &#x20;LegacyModelAndNetworkStoreSetupOptions\<T *extends* `Cache`>

```ts
interface LegacyModelAndNetworkStoreSetupOptions<T extends Cache> extends _LegacyStoreSetupOptions<T> {
  legacyRequests?: false;
  linksMode: false;
  modelFragments?: boolean;
  schemas?: (
  | ResourceSchema
  | ObjectSchema)[];
}
```

Defined in: [warp-drive-packages/legacy/src/index.ts:99](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/index.ts#L99)

Setup options for a legacy store configured to use `Model` along with the
legacy adapter/serializer network layer, but without the deprecated
`store.findRecord`/`findAll`/`query`/etc. request methods.

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

Defined in: [warp-drive-packages/legacy/src/index.ts:115](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/index.ts#L115)

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
linksMode: false;
```

Defined in: [warp-drive-packages/legacy/src/index.ts:106](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/index.ts#L106)

If true, it is presumed that no requests require use of the LegacyNetworkHandler
and associated adapters/serializer methods.

#### Default

```ts
false
```

***

### modelFragments?

```ts
optional modelFragments?: boolean;
```

Defined in: [warp-drive-packages/legacy/src/index.ts:62](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/index.ts#L62)

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

Defined in: [warp-drive-packages/legacy/src/index.ts:55](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/index.ts#L55)

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
