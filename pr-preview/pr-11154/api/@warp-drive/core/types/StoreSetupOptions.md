---
url: /pr-preview/pr-11154/api/@warp-drive/core/types/StoreSetupOptions.md
---

# &#x20;StoreSetupOptions\<T *extends* [`Cache`](cache/types/Cache.md) = [`Cache`](cache/types/Cache.md)>

```ts
interface StoreSetupOptions<T extends Cache = Cache> {
  cache: (capabilities: CacheCapabilitiesManager) => T;
  CAUTION_MEGA_DANGER_ZONE_extensions?: CAUTION_MEGA_DANGER_ZONE_Extension[];
  derivations?: Derivation[];
  handlers?: 
  | Handler[]
  | ((store: Store) => Handler[]);
  hashFns?: HashFn[];
  policy?: CachePolicy;
  schemas?: (
  | PolarisResourceSchema
  | ObjectSchema)[];
  traits?: Trait[];
  transformations?: Transformation[];
}
```

Defined in: [warp-drive-packages/core/src/index.ts:76](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/index.ts#L76)

Options for setting up a Store instance with `useRecommendedStore`.

## Type Parameters

### T

`T` *extends* [`Cache`](cache/types/Cache.md) = [`Cache`](cache/types/Cache.md)

## Properties

### cache

```ts
cache: (capabilities: CacheCapabilitiesManager) => T;
```

Defined in: [warp-drive-packages/core/src/index.ts:81](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/index.ts#L81)

A constructor for the [Cache](cache/types/Cache.md) implementation to use, receiving the
store's [CacheCapabilitiesManager](types/CacheCapabilitiesManager.md) when instantiated.

Constructs a new [Cache](cache/types/Cache.md) instance for the store.

#### Parameters

##### capabilities

[`CacheCapabilitiesManager`](types/CacheCapabilitiesManager.md)

#### Returns

`T`

***

### CAUTION\_MEGA\_DANGER\_ZONE\_extensions?

```ts
optional CAUTION_MEGA_DANGER_ZONE_extensions?: CAUTION_MEGA_DANGER_ZONE_Extension[];
```

Defined in: [warp-drive-packages/core/src/index.ts:143](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/index.ts#L143)

[Extensions](../reactive/types/CAUTION_MEGA_DANGER_ZONE_Extension.md) to use with resources, objects and arrays
to provide custom behaviors and capabilities that are not described by Schema.

This feature should only be used during a transition period to support migrating towards
schemas from existing Model and ModelFragments implementations.

***

### derivations?

```ts
optional derivations?: Derivation[];
```

Defined in: [warp-drive-packages/core/src/index.ts:127](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/index.ts#L127)

[Derivations](schema/concepts/types/Derivation.md) to use for derived fields.

***

### handlers?

```ts
optional handlers?: 
  | Handler[]
  | ((store: Store) => Handler[]);
```

Defined in: [warp-drive-packages/core/src/index.ts:113](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/index.ts#L113)

The request handlers to use. [Fetch](../variables/Fetch.md) will automatically
be added to the end of the handler chain and [CacheHandler](../variables/CacheHandler.md)
will automatically be added as the cache handler.

May also be given as a function that receives the [Store](../classes/Store.md) instance
and returns the handlers to use. This is useful when a handler needs
access to the store (e.g. to look up its owner for injections) or when
the set of handlers should be decided lazily (e.g. based on a feature
flag service that may not be ready until after the store is constructed).

The function is invoked lazily, the first time the store's `requestManager`
is accessed, and only once per store instance.

See the "Adding Stateful Handlers" section of [useRecommendedStore](../functions/useRecommendedStore.md)
for an example of using this callback to construct a handler that needs
access to an Ember service.

***

### hashFns?

```ts
optional hashFns?: HashFn[];
```

Defined in: [warp-drive-packages/core/src/index.ts:135](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/index.ts#L135)

[Hash Functions](schema/concepts/types/HashFn.md) to use for embedded object identity and polymorphic type calculations

***

### policy?

```ts
optional policy?: CachePolicy;
```

Defined in: [warp-drive-packages/core/src/index.ts:94](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/index.ts#L94)

The Cache policy to use.

Defaults to [DefaultCachePolicy](../store/classes/DefaultCachePolicy.md) configured to
respect `Expires`, `X-WarpDrive-Expires`, and `Cache-Control` headers
with a fallback to 30s soft expiration and 15m hard expiration.

***

### schemas?

```ts
optional schemas?: (
  | PolarisResourceSchema
  | ObjectSchema)[];
```

Defined in: [warp-drive-packages/core/src/index.ts:119](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/index.ts#L119)

Schemas describing the structure of your resource data.

See [,](schema/fields/types/PolarisResourceSchema.md) and [ObjectSchema](schema/fields/types/ObjectSchema.md) for more information.

***

### traits?

```ts
optional traits?: Trait[];
```

Defined in: [warp-drive-packages/core/src/index.ts:123](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/index.ts#L123)

[Traits](schema/fields/types/Trait.md) to use with [, | Resource Schemas](schema/fields/types/PolarisResourceSchema.md)

***

### transformations?

```ts
optional transformations?: Transformation[];
```

Defined in: [warp-drive-packages/core/src/index.ts:131](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/index.ts#L131)

[Transformations](schema/concepts/types/Transformation.md) to use for transforming fields.
