---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11237/api/@warp-drive/experiments/image-fetch/classes/ImageFetch.md
description: >-
  Experimental main-thread client that asks an `ImageWorker` to load image urls
  and resolves with cached object urls.
---

&#x20;

# &#x20;ImageFetch

Defined in: [warp-drive-packages/experiments/src/image-worker/fetch.ts:34](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/experiments/src/image-worker/fetch.ts#L34)

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

Defined in: [warp-drive-packages/experiments/src/image-worker/fetch.ts:46](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/experiments/src/image-worker/fetch.ts#L46)

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

Defined in: [warp-drive-packages/experiments/src/image-worker/fetch.ts:95](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/experiments/src/image-worker/fetch.ts#L95)

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

Defined in: [warp-drive-packages/experiments/src/image-worker/fetch.ts:88](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/experiments/src/image-worker/fetch.ts#L88)

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

Defined in: [warp-drive-packages/experiments/src/image-worker/fetch.ts:118](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/experiments/src/image-worker/fetch.ts#L118)

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

Defined in: [warp-drive-packages/experiments/src/image-worker/fetch.ts:39](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/experiments/src/image-worker/fetch.ts#L39)

***

### channel

```ts
channel: MessageChannel;
```

Defined in: [warp-drive-packages/experiments/src/image-worker/fetch.ts:38](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/experiments/src/image-worker/fetch.ts#L38)

***

### pending

```ts
pending: Map<string, Deferred<string>>;
```

Defined in: [warp-drive-packages/experiments/src/image-worker/fetch.ts:37](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/experiments/src/image-worker/fetch.ts#L37)

***

### threadId

```ts
threadId: string;
```

Defined in: [warp-drive-packages/experiments/src/image-worker/fetch.ts:36](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/experiments/src/image-worker/fetch.ts#L36)

***

### worker

```ts
worker: 
  | Worker
  | SharedWorker;
```

Defined in: [warp-drive-packages/experiments/src/image-worker/fetch.ts:35](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/experiments/src/image-worker/fetch.ts#L35)
