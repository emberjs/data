---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/experiments/data-worker/classes/DataWorker.md
---

&#x20;

# &#x20;DataWorker

Defined in: [data-worker/worker.ts:10](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/experiments/src/data-worker/worker.ts#L10)

## Constructors

### Constructor

```ts
new DataWorker(UserStore: typeof Store$1, options?: {
  persisted: boolean;
  scope?: string;
}): DataWorker;
```

Defined in: [data-worker/worker.ts:18](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/experiments/src/data-worker/worker.ts#L18)

#### Parameters

##### UserStore

*typeof* `Store$1`

##### options?

###### persisted

`boolean`

###### scope?

`string`

#### Returns

`DataWorker`

## Methods

### abortRequest()

```ts
abortRequest(event: AbortEventData): void;
```

Defined in: [data-worker/worker.ts:86](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/experiments/src/data-worker/worker.ts#L86)

#### Parameters

##### event

`AbortEventData`

#### Returns

`void`

***

### initialize()

```ts
initialize(): void;
```

Defined in: [data-worker/worker.ts:31](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/experiments/src/data-worker/worker.ts#L31)

#### Returns

`void`

***

### request()

```ts
request(event: RequestEventData): Promise<void>;
```

Defined in: [data-worker/worker.ts:96](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/experiments/src/data-worker/worker.ts#L96)

#### Parameters

##### event

`RequestEventData`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>

***

### setupThread()

```ts
setupThread(thread: string, port: MessagePort): void;
```

Defined in: [data-worker/worker.ts:65](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/experiments/src/data-worker/worker.ts#L65)

#### Parameters

##### thread

`string`

##### port

[`MessagePort`](https://developer.mozilla.org/docs/Web/API/MessagePort)

#### Returns

`void`

## Properties

### isSharedWorker

```ts
isSharedWorker: boolean;
```

Defined in: [data-worker/worker.ts:14](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/experiments/src/data-worker/worker.ts#L14)

***

### options

```ts
options: {
  persisted: boolean;
  scope?: string;
};
```

Defined in: [data-worker/worker.ts:15](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/experiments/src/data-worker/worker.ts#L15)

#### persisted

```ts
persisted: boolean;
```

#### scope?

```ts
optional scope?: string;
```

***

### pending

```ts
pending: Map<string, Map<number, Future<unknown>>>;
```

Defined in: [data-worker/worker.ts:13](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/experiments/src/data-worker/worker.ts#L13)

***

### storage

```ts
storage: DocumentStorage;
```

Defined in: [data-worker/worker.ts:16](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/experiments/src/data-worker/worker.ts#L16)

***

### store

```ts
store: Store$1;
```

Defined in: [data-worker/worker.ts:11](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/experiments/src/data-worker/worker.ts#L11)

***

### threads

```ts
threads: Map<string, MessagePort>;
```

Defined in: [data-worker/worker.ts:12](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/experiments/src/data-worker/worker.ts#L12)
