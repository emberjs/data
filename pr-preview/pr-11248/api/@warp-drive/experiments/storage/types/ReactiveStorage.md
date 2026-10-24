---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/experiments/storage/types/ReactiveStorage.md
description: >-
  Experimental signal-backed wrapper around a `Storage` area that makes reads
  reactive and updates on changes from other tabs.
---

&#x20;

# &#x20;ReactiveStorage

```ts
interface ReactiveStorage {
  get length(): number;
  clear(): void;
  getItem(key: string): string | null;
  key(index: number): string | null;
  peekItem(key: string): string | null;
  removeItem(key: string): void;
  setEffect(key: string, fn: (value: EffectStorageEvent) => void): void;
  setItem(key: string, value: string): void;
}
```

Defined in: [warp-drive-packages/experiments/src/storage/storage.ts:158](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/experiments/src/storage/storage.ts#L158)

A reactive wrapper around the Web Storage API (localStorage/sessionStorage)
that provides signal-based access to storage items and length.

Will automatically update when storage events occur in other tabs/windows.

## Implements

* [`Storage`](https://developer.mozilla.org/docs/Web/API/Storage)

## Methods

### clear()

```ts
clear(): void;
```

Defined in: [warp-drive-packages/experiments/src/storage/storage.ts:349](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/experiments/src/storage/storage.ts#L349)

Clears all keys from Storage, triggering reactivity

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

Defined in: [warp-drive-packages/experiments/src/storage/storage.ts:243](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/experiments/src/storage/storage.ts#L243)

Reactive access to Storage contents

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

Defined in: [warp-drive-packages/experiments/src/storage/storage.ts:364](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/experiments/src/storage/storage.ts#L364)

Reactive access to the key at the given index

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

### peekItem()

```ts
peekItem(key: string): string | null;
```

Defined in: [warp-drive-packages/experiments/src/storage/storage.ts:221](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/experiments/src/storage/storage.ts#L221)

Non-reactive way to peek the current value of a key in Storage

#### Parameters

##### key

`string`

#### Returns

`string` | `null`

***

### removeItem()

```ts
removeItem(key: string): void;
```

Defined in: [warp-drive-packages/experiments/src/storage/storage.ts:327](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/experiments/src/storage/storage.ts#L327)

Remove a value from Storage, triggering reactivity

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

### setEffect()

```ts
setEffect(key: string, fn: (value: EffectStorageEvent) => void): void;
```

Defined in: [warp-drive-packages/experiments/src/storage/storage.ts:168](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/experiments/src/storage/storage.ts#L168)

#### Parameters

##### key

`string`

##### fn

(`value`: [`EffectStorageEvent`](EffectStorageEvent.md)) => `void`

#### Returns

`void`

***

### setItem()

```ts
setItem(key: string, value: string): void;
```

Defined in: [warp-drive-packages/experiments/src/storage/storage.ts:268](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/experiments/src/storage/storage.ts#L268)

Set a value in Storage, triggering reactivity

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

## Properties

### length

#### Get Signature

```ts
get length(): number;
```

Defined in: [warp-drive-packages/experiments/src/storage/storage.ts:214](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/experiments/src/storage/storage.ts#L214)

Reactive access to the number of keys in Storage

##### Returns

`number`

#### Implementation of

```ts
Storage.length
```
