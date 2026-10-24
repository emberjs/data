---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/experiments/storage/classes/CacheStorage.md
---

&#x20;

# &#x20;CacheStorage

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:84](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/experiments/src/storage/cache.ts#L84)

A reactive interface for json stored in the browser [Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache) API.

This is a good option for larger data sets than can be efficiently stored in localStorage
but should not be used as a permanent DB or storage solution.

## Implements

* [`Storage`](https://developer.mozilla.org/docs/Web/API/Storage)

## Constructors

### Constructor

```ts
new CacheStorage(cacheId: string): CacheStorage;
```

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:102](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/experiments/src/storage/cache.ts#L102)

#### Parameters

##### cacheId

`string`

#### Returns

`CacheStorage`

## Methods

### clear()

```ts
clear(): void;
```

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:136](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/experiments/src/storage/cache.ts#L136)

The **`clear()`** method of the Storage interface clears all keys stored in a given Storage object.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Storage/clear)

#### Returns

`void`

#### Implementation of

```ts
Storage.clear
```

***

### getItem()

```ts
getItem(key: string): string | null;
```

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:141](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/experiments/src/storage/cache.ts#L141)

The **`getItem()`** method of the Storage interface, when passed a key name, will return that key's value, or null if the key does not exist, in the given Storage object.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Storage/getItem)

#### Parameters

##### key

`string`

#### Returns

`string` | `null`

#### Implementation of

```ts
Storage.getItem
```

***

### key()

```ts
key(index: number): string | null;
```

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:145](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/experiments/src/storage/cache.ts#L145)

The **`key()`** method of the Storage interface, when passed a number n, returns the name of the nth key in a given Storage object. The order of keys is user-agent defined, so you should not rely on it.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Storage/key)

#### Parameters

##### index

`number`

#### Returns

`string` | `null`

#### Implementation of

```ts
Storage.key
```

***

### removeItem()

```ts
removeItem(key: string): void;
```

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:161](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/experiments/src/storage/cache.ts#L161)

The **`removeItem()`** method of the Storage interface, when passed a key name, will remove that key from the given Storage object if it exists. The Storage interface of the Web Storage API provides access to a particular domain's session or local storage.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Storage/removeItem)

#### Parameters

##### key

`string`

#### Returns

`void`

#### Implementation of

```ts
Storage.removeItem
```

***

### setItem()

```ts
setItem(key: string, value: string): void;
```

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:169](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/experiments/src/storage/cache.ts#L169)

The **`setItem()`** method of the Storage interface, when passed a key name and value, will add that key to the given Storage object, or update that key's value if it already exists.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Storage/setItem)

#### Parameters

##### key

`string`

##### value

`string`

#### Returns

`void`

#### Implementation of

```ts
Storage.setItem
```

***

### expectCache()

```ts
static expectCache(cacheId?: string): CacheStorage;
```

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:193](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/experiments/src/storage/cache.ts#L193)

#### Parameters

##### cacheId?

`string` = `DEFAULT_CACHE_ID`

#### Returns

`CacheStorage`

***

### get()

```ts
static get(cacheId?: string): Promise<CacheStorage>;
```

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:184](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/experiments/src/storage/cache.ts#L184)

Get the singleton CacheStorage instance.

#### Parameters

##### cacheId?

`string` = `DEFAULT_CACHE_ID`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`CacheStorage`>

***

### getAllCacheIds()

```ts
static getAllCacheIds(): string[];
```

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:205](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/experiments/src/storage/cache.ts#L205)

Returns the IDs of all CacheStorage instances that have been
opened in this context via [CacheStorage.get](#get).

#### Returns

`string`\[]

## Properties

### \_bufferedEvents

```ts
_bufferedEvents: InternalCacheStorageEvent[] = [];
```

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:90](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/experiments/src/storage/cache.ts#L90)

***

### \_data

```ts
_data: Map<string, string | null>;
```

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:88](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/experiments/src/storage/cache.ts#L88)

***

### \_nextUpdate

```ts
_nextUpdate: number | null = null;
```

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:89](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/experiments/src/storage/cache.ts#L89)

### length

#### Get Signature

```ts
get length(): number;
```

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:108](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/experiments/src/storage/cache.ts#L108)

The **`length`** read-only property of the Storage interface returns the number of data items stored in a given Storage object.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Storage/length)

##### Returns

`number`

#### Implementation of

```ts
Storage.length
```
