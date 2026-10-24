---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11389/api/@warp-drive/core/types/request/types/ImmutableRequestInfo.md
description: >-
  Read-only form of a request as handlers receive it, with frozen headers, data,
  options, and cache options and no `controller`.
---

# &#x20;ImmutableRequestInfo\<RT = `unknown`>

```ts
type ImmutableRequestInfo<RT = unknown> = Readonly<Omit<RequestInfo<RT>, "controller">> & {
  bodyUsed?: boolean;
  cacheOptions?: Readonly<CacheOptions>;
  data?: Readonly<Record<string, unknown>>;
  headers?: ImmutableHeaders;
  options?: Readonly<Record<string, unknown>>;
};
```

Defined in: [warp-drive-packages/core/src/types/request.ts:774](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/types/request.ts#L774)

Immutable version of [RequestInfo](RequestInfo.md). This is what is passed to handlers.

## Type Declaration

### bodyUsed?

```ts
readonly optional bodyUsed?: boolean;
```

Whether the request body has been read.

### cacheOptions?

```ts
readonly optional cacheOptions?: Readonly<CacheOptions>;
```

see [CacheOptions](CacheOptions.md)

### data?

```ts
readonly optional data?: Readonly<Record<string, unknown>>;
```

see [RequestInfo.data](RequestInfo.md#data)

### headers?

```ts
readonly optional headers?: ImmutableHeaders;
```

see [ImmutableHeaders](ImmutableHeaders.md)

### options?

```ts
readonly optional options?: Readonly<Record<string, unknown>>;
```

see [RequestInfo.options](RequestInfo.md#options)

## Type Parameters

### RT

`RT` = `unknown`
