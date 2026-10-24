---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/experiments/worker-fetch/classes/WorkerFetch.md
---

&#x20;

# &#x20;WorkerFetch

Defined in: [warp-drive-packages/experiments/src/data-worker/fetch.ts:49](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/experiments/src/data-worker/fetch.ts#L49)

## Constructors

### Constructor

```ts
new WorkerFetch(worker: 
  | Worker
  | SharedWorker
  | null): WorkerFetch;
```

Defined in: [warp-drive-packages/experiments/src/data-worker/fetch.ts:55](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/experiments/src/data-worker/fetch.ts#L55)

#### Parameters

##### worker

| [`Worker`](https://developer.mozilla.org/docs/Web/API/Worker)
| [`SharedWorker`](https://developer.mozilla.org/docs/Web/API/SharedWorker)
| `null`

#### Returns

`WorkerFetch`

## Methods

### cleanupRequest()

```ts
cleanupRequest(id: number): PendingItem | undefined;
```

Defined in: [warp-drive-packages/experiments/src/data-worker/fetch.ts:107](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/experiments/src/data-worker/fetch.ts#L107)

#### Parameters

##### id

`number`

#### Returns

`PendingItem` | `undefined`

***

### request()

```ts
request<T>(context: Context$1, next: NextFn<T>): 
  | Promise<T>
| Future<T>;
```

Defined in: [warp-drive-packages/experiments/src/data-worker/fetch.ts:123](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/experiments/src/data-worker/fetch.ts#L123)

#### Type Parameters

##### T

`T`

#### Parameters

##### context

`Context$1`

##### next

`NextFn`<`T`>

#### Returns

| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`T`>
| `Future`<`T`>

***

### send()

```ts
send(event: RequestEventData | AbortEventData): void;
```

Defined in: [warp-drive-packages/experiments/src/data-worker/fetch.ts:118](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/experiments/src/data-worker/fetch.ts#L118)

#### Parameters

##### event

`RequestEventData` | `AbortEventData`

#### Returns

`void`

## Properties

### channel

```ts
channel: MessageChannel;
```

Defined in: [warp-drive-packages/experiments/src/data-worker/fetch.ts:53](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/experiments/src/data-worker/fetch.ts#L53)

***

### pending

```ts
pending: Map<number, PendingItem>;
```

Defined in: [warp-drive-packages/experiments/src/data-worker/fetch.ts:52](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/experiments/src/data-worker/fetch.ts#L52)

***

### threadId

```ts
threadId: string;
```

Defined in: [warp-drive-packages/experiments/src/data-worker/fetch.ts:51](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/experiments/src/data-worker/fetch.ts#L51)

***

### worker

```ts
worker: 
  | Worker
  | SharedWorker;
```

Defined in: [warp-drive-packages/experiments/src/data-worker/fetch.ts:50](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/experiments/src/data-worker/fetch.ts#L50)
