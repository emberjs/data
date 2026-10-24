---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/legacy/types/LegacyModelAndNetworkAndRequestStoreSetupOptions.md
---

&#x20;

# &#x20;LegacyModelAndNetworkAndRequestStoreSetupOptions\<T *extends* `Cache`>

```ts
interface LegacyModelAndNetworkAndRequestStoreSetupOptions<T extends Cache> extends _LegacyStoreSetupOptions<T> {
  legacyRequests: true;
  linksMode: false;
  modelFragments?: boolean;
  schemas?: (
  | ResourceSchema
  | ObjectSchema)[];
}
```

Defined in: [warp-drive-packages/legacy/src/index.ts:125](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/index.ts#L125)

Setup options for a legacy store configured to use `Model` along with the
legacy adapter/serializer network layer and the deprecated
`store.findRecord`/`findAll`/`query`/etc. request methods.

## Extends

* `_LegacyStoreSetupOptions`<`T`>

## Type Parameters

### T

`T` *extends* `Cache`

## Properties

### legacyRequests

```ts
legacyRequests: true;
```

Defined in: [warp-drive-packages/legacy/src/index.ts:141](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/index.ts#L141)

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

Defined in: [warp-drive-packages/legacy/src/index.ts:132](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/index.ts#L132)

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

Defined in: [warp-drive-packages/legacy/src/index.ts:62](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/index.ts#L62)

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

Defined in: [warp-drive-packages/legacy/src/index.ts:55](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/index.ts#L55)

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
