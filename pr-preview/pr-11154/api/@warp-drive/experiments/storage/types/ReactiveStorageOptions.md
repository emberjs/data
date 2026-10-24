---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/experiments/storage/types/ReactiveStorageOptions.md
---

&#x20;

# &#x20;ReactiveStorageOptions

```ts
interface ReactiveStorageOptions {
  fallbackToMemory?: boolean;
  onQuotaExceeded?: (key: string, value: string) => 
  | boolean
  | Promise<boolean>;
  updateOnQuotaExceeded?: boolean;
}
```

Defined in: [storage/storage.ts:7](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/experiments/src/storage/storage.ts#L7)

## Properties

### fallbackToMemory?

```ts
optional fallbackToMemory?: boolean;
```

Defined in: [storage/storage.ts:12](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/experiments/src/storage/storage.ts#L12)

If true, falls back to in-memory storage when the underlying
storage is unavailable (e.g., private browsing mode).

***

### onQuotaExceeded?

```ts
optional onQuotaExceeded?: (key: string, value: string) => 
  | boolean
| Promise<boolean>;
```

Defined in: [storage/storage.ts:24](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/experiments/src/storage/storage.ts#L24)

Called when a write fails due to quota exceeded.
Return true to retry the write after freeing space.

#### Parameters

##### key

`string`

##### value

`string`

#### Returns

| `boolean`
| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`boolean`>

***

### updateOnQuotaExceeded?

```ts
optional updateOnQuotaExceeded?: boolean;
```

Defined in: [storage/storage.ts:18](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/experiments/src/storage/storage.ts#L18)

If true, updates signal state even when writes fail due to quota.
The onQuotaExceeded callback will be invoked before retrying.
