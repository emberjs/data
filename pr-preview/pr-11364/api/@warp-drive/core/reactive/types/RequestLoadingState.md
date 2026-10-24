---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/core/reactive/types/RequestLoadingState.md
description: >-
  Reactive download progress for a request, such as bytes loaded and timing,
  built by lazily reading its response stream.
---

# &#x20;RequestLoadingState

```ts
interface RequestLoadingState {
  promise: 
  | Promise<void>
  | null;
  get bytesLoaded(): number;
  get completedRatio(): number;
  get duration(): number;
  get elapsedTime(): number;
  get endTime(): number;
  get error(): 
  | Error
  | null;
  get isCancelled(): boolean;
  get isComplete(): boolean;
  get isErrored(): boolean;
  get isPending(): boolean;
  get isStarted(): boolean;
  get lastPacketTime(): number;
  get remainingRatio(): number;
  get sizeHint(): number;
  get speed(): number;
  get startTime(): number;
  get stream(): 
  | ReadableStream<any>
  | null;
  abort(): void;
}
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:112](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/request-state.ts#L112)

**`Hideconstructor`**

Lazily consumes the stream of a request, providing a number of
reactive properties that can be used to build UIs that respond
to the progress of a request.

## Methods

### abort()

```ts
abort(): void;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:332](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/request-state.ts#L332)

Aborts the underlying request.

#### Returns

`void`

## Properties

### promise

```ts
promise: 
  | Promise<void>
  | null = null;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:179](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/request-state.ts#L179)

Resolves once the stream has finished being consumed, or rejects
if the request errors. `null` until first accessed.

### bytesLoaded

#### Get Signature

```ts
get bytesLoaded(): number;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:224](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/request-state.ts#L224)

The number of bytes loaded so far.

##### Returns

`number`

***

### completedRatio

#### Get Signature

```ts
get completedRatio(): number;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:298](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/request-state.ts#L298)

The ratio (0 to 1) of [bytesLoaded](#bytesloaded)
to [sizeHint](#sizehint), or `0` if no size hint is available.

##### Returns

`number`

***

### duration

#### Get Signature

```ts
get duration(): number;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:313](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/request-state.ts#L313)

The total number of milliseconds elapsed between
[startTime](#starttime) and [endTime](#endtime).

##### Returns

`number`

***

### elapsedTime

#### Get Signature

```ts
get elapsedTime(): number;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:290](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/request-state.ts#L290)

The number of milliseconds elapsed since the stream started being
consumed, using the last packet time (or end time, once complete)
as the endpoint.

##### Returns

`number`

***

### endTime

#### Get Signature

```ts
get endTime(): number;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:240](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/request-state.ts#L240)

The `performance.now()` timestamp at which the stream finished being consumed.

##### Returns

`number`

***

### error

#### Get Signature

```ts
get error(): 
  | Error
  | null;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:280](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/request-state.ts#L280)

The error that occurred while consuming the stream, if any.

##### Returns

| [`Error`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error)
| `null`

***

### isCancelled

#### Get Signature

```ts
get isCancelled(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:264](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/request-state.ts#L264)

Whether the request was aborted before the stream finished being consumed.

##### Returns

`boolean`

***

### isComplete

#### Get Signature

```ts
get isComplete(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:256](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/request-state.ts#L256)

Whether the stream has finished being consumed.

##### Returns

`boolean`

***

### isErrored

#### Get Signature

```ts
get isErrored(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:272](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/request-state.ts#L272)

Whether an error occurred while consuming the stream.

##### Returns

`boolean`

***

### isPending

#### Get Signature

```ts
get isPending(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:184](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/request-state.ts#L184)

Whether the stream has not yet started being consumed.

##### Returns

`boolean`

***

### isStarted

#### Get Signature

```ts
get isStarted(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:216](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/request-state.ts#L216)

Whether the stream has started being consumed but has not yet completed.

##### Returns

`boolean`

***

### lastPacketTime

#### Get Signature

```ts
get lastPacketTime(): number;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:248](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/request-state.ts#L248)

The `performance.now()` timestamp at which the last chunk of data was received.

##### Returns

`number`

***

### remainingRatio

#### Get Signature

```ts
get remainingRatio(): number;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:305](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/request-state.ts#L305)

The inverse of [completedRatio](#completedratio).

##### Returns

`number`

***

### sizeHint

#### Get Signature

```ts
get sizeHint(): number;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:193](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/request-state.ts#L193)

The total size of the response in bytes, if known ahead of time
(via a `Content-Length` header or similar).

##### Returns

`number`

***

### speed

#### Get Signature

```ts
get speed(): number;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:320](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/request-state.ts#L320)

The average download speed in bytes per second.

##### Returns

`number`

***

### startTime

#### Get Signature

```ts
get startTime(): number;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:232](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/request-state.ts#L232)

The `performance.now()` timestamp at which the stream started being consumed.

##### Returns

`number`

***

### stream

#### Get Signature

```ts
get stream(): 
  | ReadableStream<any>
  | null;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:202](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/request-state.ts#L202)

A readable stream of the response content. Accessing this property
begins consumption of the underlying request stream.

##### Returns

| [`ReadableStream`](https://developer.mozilla.org/docs/Web/API/ReadableStream)<`any`>
| `null`
