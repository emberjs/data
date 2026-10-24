---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/legacy/classes/ConfiguredStore.md
---

&#x20;

# &#x20;ConfiguredStore\<T *extends* { `cache`: `Cache`; }>

Defined in: [warp-drive-packages/legacy/src/index.ts:159](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/index.ts#L159)

## Extends

* `Store$1`

## Type Parameters

### T

`T` *extends* {
`cache`: `Cache`;
}

## Indexable

```ts
[key: string]: any
```

## Methods

### createCache()

```ts
createCache(capabilities: CacheCapabilitiesManager$1): T["cache"];
```

Defined in: [warp-drive-packages/legacy/src/index.ts:168](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/index.ts#L168)

Instantiation hook allowing applications or addons to configure the store
to utilize a custom Cache implementation.

This hook should not be called directly by consuming applications or libraries.
Use `Store.cache` to access the Cache instance.

#### Parameters

##### capabilities

`CacheCapabilitiesManager$1`

#### Returns

`T`\[`"cache"`]

#### Overrides

```ts
Store.createCache
```
