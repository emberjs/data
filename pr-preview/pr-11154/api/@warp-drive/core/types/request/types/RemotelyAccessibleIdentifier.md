---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/types/request/types/RemotelyAccessibleIdentifier.md
---

# &#x20;RemotelyAccessibleIdentifier\<T *extends* `string` = `string`>

```ts
type RemotelyAccessibleIdentifier<T extends string = string> = {
  id: string;
  lid?: string;
  type: T;
};
```

Defined in: [warp-drive-packages/core/src/types/request.ts:378](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/request.ts#L378)

A minimal reference to a resource sufficient to build a URL for it,
as accepted by the request builders.

## Type Parameters

### T

`T` *extends* `string` = `string`

## Properties

### id

```ts
id: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:382](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/request.ts#L382)

the resource's persisted id

***

### lid?

```ts
optional lid?: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:390](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/request.ts#L390)

the local identifier WarpDrive has assigned to the resource, if known

***

### type

```ts
type: T;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:386](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/request.ts#L386)

the resource's type
