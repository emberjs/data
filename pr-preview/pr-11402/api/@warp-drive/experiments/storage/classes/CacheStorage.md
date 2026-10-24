---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11402/api/@warp-drive/experiments/storage/classes/CacheStorage.md
description: >-
  Experimental `Storage`-compatible interface over the browser Cache API, suited
  to larger JSON data sets than localStorage.
---

&#x20;

# &#x20;CacheStorage

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:87](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/experiments/src/storage/cache.ts#L87)

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

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:105](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/experiments/src/storage/cache.ts#L105)

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

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:139](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/experiments/src/storage/cache.ts#L139)

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

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:144](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/experiments/src/storage/cache.ts#L144)

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

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:148](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/experiments/src/storage/cache.ts#L148)

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

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:164](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/experiments/src/storage/cache.ts#L164)

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

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:172](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/experiments/src/storage/cache.ts#L172)

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

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:196](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/experiments/src/storage/cache.ts#L196)

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

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:187](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/experiments/src/storage/cache.ts#L187)

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

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:208](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/experiments/src/storage/cache.ts#L208)

Returns the IDs of all CacheStorage instances that have been
opened in this context via [CacheStorage.get](#get).

#### Returns

`string`\[]

## Properties

### \_bufferedEvents

```ts
_bufferedEvents: InternalCacheStorageEvent[] = [];
```

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:93](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/experiments/src/storage/cache.ts#L93)

***

### \_data

```ts
_data: Map<string, string | null>;
```

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:91](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/experiments/src/storage/cache.ts#L91)

***

### \_nextUpdate

```ts
_nextUpdate: number | null = null;
```

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:92](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/experiments/src/storage/cache.ts#L92)

### length

#### Get Signature

```ts
get length(): number;
```

Defined in: [warp-drive-packages/experiments/src/storage/cache.ts:111](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/experiments/src/storage/cache.ts#L111)

The **`length`** read-only property of the Storage interface returns the number of data items stored in a given Storage object.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Storage/length)

##### Returns

`number`

#### Implementation of

```ts
Storage.length
```
