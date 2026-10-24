---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11218/api/@warp-drive/core/types/request/types/RemotelyAccessibleIdentifier.md
description: >-
  A resource reference with a persisted `id` and `type` and an optional `lid`,
  which is enough for request builders to construct its url.
---

# &#x20;RemotelyAccessibleIdentifier\<T *extends* `string` = `string`>

```ts
type RemotelyAccessibleIdentifier<T extends string = string> = {
  id: string;
  lid?: string;
  type: T;
};
```

Defined in: [warp-drive-packages/core/src/types/request.ts:424](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/core/src/types/request.ts#L424)

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

Defined in: [warp-drive-packages/core/src/types/request.ts:428](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/core/src/types/request.ts#L428)

the resource's persisted id

***

### lid?

```ts
optional lid?: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:436](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/core/src/types/request.ts#L436)

the local identifier WarpDrive has assigned to the resource, if known

***

### type

```ts
type: T;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:432](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/core/src/types/request.ts#L432)

the resource's type
