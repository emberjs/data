---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/experiments/image-fetch/classes/ImageFetch.md
---

&#x20;

# &#x20;ImageFetch

Defined in: [image-worker/fetch.ts:32](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/experiments/src/image-worker/fetch.ts#L32)

Main-thread client for an [ImageWorker](../../image-worker/classes/ImageWorker.md). Sends image `load`
requests to a `Worker` or `SharedWorker` running an `ImageWorker`.

In FastBoot/SSR, or when constructed with a `null` worker, `ImageFetch`
skips worker communication entirely: [ImageFetch.load](#load) resolves
immediately with the given url.

A plain `Worker` is only accepted when running in a `TESTING` build;
production usage requires a `SharedWorker`.

## Constructors

### Constructor

```ts
new ImageFetch(worker: 
  | Worker
  | SharedWorker
  | null): ImageFetch;
```

Defined in: [image-worker/fetch.ts:44](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/experiments/src/image-worker/fetch.ts#L44)

#### Parameters

##### worker

| [`Worker`](https://developer.mozilla.org/docs/Web/API/Worker)
| [`SharedWorker`](https://developer.mozilla.org/docs/Web/API/SharedWorker)
| `null`

the `Worker` or `SharedWorker` running an
[ImageWorker](../../image-worker/classes/ImageWorker.md), or `null` to disable worker communication (e.g.
in FastBoot/SSR).

#### Returns

`ImageFetch`

## Methods

### \_send()

```ts
_send(event: RequestEventData): void;
```

Defined in: [image-worker/fetch.ts:93](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/experiments/src/image-worker/fetch.ts#L93)

#### Parameters

##### event

`RequestEventData`

#### Returns

`void`

***

### cleanupRequest()

```ts
cleanupRequest(url: string): Deferred<string> | undefined;
```

Defined in: [image-worker/fetch.ts:86](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/experiments/src/image-worker/fetch.ts#L86)

#### Parameters

##### url

`string`

#### Returns

`Deferred`<`string`> | `undefined`

***

### load()

```ts
load(url: string): Promise<string>;
```

Defined in: [image-worker/fetch.ts:116](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/experiments/src/image-worker/fetch.ts#L116)

Requests that the given image url be loaded by the connected
[ImageWorker](../../image-worker/classes/ImageWorker.md), resolving with an object url for the fetched
image's blob once the worker responds (or immediately with the
original `url`, in SSR/FastBoot or when this instance was constructed
with a `null` worker).

The resolved object url is cached in-memory by source url on this
instance, so subsequent calls for the same url resolve immediately
without another round-trip to the worker.

Calling `load` again for a url that is already in-flight (not yet
cached) on this instance replaces the pending request rather than
joining it — only the most recently issued call for a given url will
resolve.

#### Parameters

##### url

`string`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`string`>

## Properties

### cache

```ts
cache: Map<string, string>;
```

Defined in: [image-worker/fetch.ts:37](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/experiments/src/image-worker/fetch.ts#L37)

***

### channel

```ts
channel: MessageChannel;
```

Defined in: [image-worker/fetch.ts:36](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/experiments/src/image-worker/fetch.ts#L36)

***

### pending

```ts
pending: Map<string, Deferred<string>>;
```

Defined in: [image-worker/fetch.ts:35](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/experiments/src/image-worker/fetch.ts#L35)

***

### threadId

```ts
threadId: string;
```

Defined in: [image-worker/fetch.ts:34](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/experiments/src/image-worker/fetch.ts#L34)

***

### worker

```ts
worker: 
  | Worker
  | SharedWorker;
```

Defined in: [image-worker/fetch.ts:33](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/experiments/src/image-worker/fetch.ts#L33)
