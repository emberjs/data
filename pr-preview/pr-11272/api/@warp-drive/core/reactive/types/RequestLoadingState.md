---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/reactive/types/RequestLoadingState.md
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

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:110](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/signals/request-state.ts#L110)

**`Hideconstructor`**

Lazily consumes the stream of a request, providing a number of
reactive properties that can be used to build UIs that respond
to the progress of a request.

## Methods

### abort()

```ts
abort(): void;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:330](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/signals/request-state.ts#L330)

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

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:177](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/signals/request-state.ts#L177)

Resolves once the stream has finished being consumed, or rejects
if the request errors. `null` until first accessed.

### bytesLoaded

#### Get Signature

```ts
get bytesLoaded(): number;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:222](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/signals/request-state.ts#L222)

The number of bytes loaded so far.

##### Returns

`number`

***

### completedRatio

#### Get Signature

```ts
get completedRatio(): number;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:296](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/signals/request-state.ts#L296)

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

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:311](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/signals/request-state.ts#L311)

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

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:288](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/signals/request-state.ts#L288)

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

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:238](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/signals/request-state.ts#L238)

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

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:278](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/signals/request-state.ts#L278)

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

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:262](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/signals/request-state.ts#L262)

Whether the request was aborted before the stream finished being consumed.

##### Returns

`boolean`

***

### isComplete

#### Get Signature

```ts
get isComplete(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:254](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/signals/request-state.ts#L254)

Whether the stream has finished being consumed.

##### Returns

`boolean`

***

### isErrored

#### Get Signature

```ts
get isErrored(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:270](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/signals/request-state.ts#L270)

Whether an error occurred while consuming the stream.

##### Returns

`boolean`

***

### isPending

#### Get Signature

```ts
get isPending(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:182](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/signals/request-state.ts#L182)

Whether the stream has not yet started being consumed.

##### Returns

`boolean`

***

### isStarted

#### Get Signature

```ts
get isStarted(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:214](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/signals/request-state.ts#L214)

Whether the stream has started being consumed but has not yet completed.

##### Returns

`boolean`

***

### lastPacketTime

#### Get Signature

```ts
get lastPacketTime(): number;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:246](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/signals/request-state.ts#L246)

The `performance.now()` timestamp at which the last chunk of data was received.

##### Returns

`number`

***

### remainingRatio

#### Get Signature

```ts
get remainingRatio(): number;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:303](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/signals/request-state.ts#L303)

The inverse of [completedRatio](#completedratio).

##### Returns

`number`

***

### sizeHint

#### Get Signature

```ts
get sizeHint(): number;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:191](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/signals/request-state.ts#L191)

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

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:318](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/signals/request-state.ts#L318)

The average download speed in bytes per second.

##### Returns

`number`

***

### startTime

#### Get Signature

```ts
get startTime(): number;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:230](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/signals/request-state.ts#L230)

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

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:200](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/signals/request-state.ts#L200)

A readable stream of the response content. Accessing this property
begins consumption of the underlying request stream.

##### Returns

| [`ReadableStream`](https://developer.mozilla.org/docs/Web/API/ReadableStream)<`any`>
| `null`
