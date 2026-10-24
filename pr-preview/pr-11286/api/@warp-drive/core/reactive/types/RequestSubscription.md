---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/reactive/types/RequestSubscription.md
---

# &#x20;RequestSubscription\<RT, E>

```ts
interface RequestSubscription<RT, E> {
  isHidden: boolean;
  isOnline: boolean;
  isRefreshing: boolean;
  store: 
  | Store
  | RequestManager;
  get autorefreshTypes(): Set<AutorefreshBehaviorType>;
  get contentFeatures(): ContentFeatures<RT>;
  get errorFeatures(): RecoveryFeatures;
  get isIdle(): boolean;
  get reqState(): RequestState<RT, StructuredErrorDocument<E>>;
  get request(): Future<RT>;
  get result(): RT;
  (symbol) dispose(): void;
  refresh(): Promise<void>;
  retry(): Promise<void>;
}
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:191](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/signals/request-subscription.ts#L191)

**`Hideconstructor`**

A reactive class

## Type Parameters

### RT

`RT`

### E

`E`

## Methods

### (symbol) dispose()

```ts
(symbol) dispose(): void;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:196](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/signals/request-subscription.ts#L196)

The method to call when the component this subscription is attached to
unmounts.

#### Returns

`void`

***

### refresh()

```ts
refresh(): Promise<void>;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:709](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/signals/request-subscription.ts#L709)

Refresh the request, updating it in the background.

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>

***

### retry()

```ts
retry(): Promise<void>;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:701](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/signals/request-subscription.ts#L701)

Retry the request, reloading it from the server.

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>

## Properties

### isHidden

```ts
isHidden: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:213](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/signals/request-subscription.ts#L213)

Whether the browser reports that the tab is hidden.

***

### isOnline

```ts
isOnline: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:208](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/signals/request-subscription.ts#L208)

Whether the browser reports that the network is online.

***

### isRefreshing

```ts
isRefreshing: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:218](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/signals/request-subscription.ts#L218)

Whether the component is currently refreshing the request.

***

### store

```ts
store: 
  | Store
  | RequestManager;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:300](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/signals/request-subscription.ts#L300)

The Store this subscription subscribes to or the RequestManager
which issues this request.

### autorefreshTypes

#### Get Signature

```ts
get autorefreshTypes(): Set<AutorefreshBehaviorType>;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:362](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/signals/request-subscription.ts#L362)

The set of [AutorefreshBehaviorType](AutorefreshBehaviorType.md)s this subscription is
configured to autorefresh for, derived from [SubscriptionArgs.autorefresh](SubscriptionArgs.md#autorefresh).

##### Returns

[`Set`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Set)<[`AutorefreshBehaviorType`](AutorefreshBehaviorType.md)>

***

### contentFeatures

#### Get Signature

```ts
get contentFeatures(): ContentFeatures<RT>;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:730](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/signals/request-subscription.ts#L730)

features to yield to the content slot of a component

##### Returns

[`ContentFeatures`](ContentFeatures.md)<`RT`>

***

### errorFeatures

#### Get Signature

```ts
get errorFeatures(): RecoveryFeatures;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:718](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/signals/request-subscription.ts#L718)

features to yield to the error slot of a component

##### Returns

[`RecoveryFeatures`](RecoveryFeatures.md)

***

### isIdle

#### Get Signature

```ts
get isIdle(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:351](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/signals/request-subscription.ts#L351)

Whether neither a `request` nor a `query` arg was provided, and so
this subscription has nothing to fetch or monitor.

##### Returns

`boolean`

***

### reqState

#### Get Signature

```ts
get reqState(): RequestState<RT, StructuredErrorDocument<E>>;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:800](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/signals/request-subscription.ts#L800)

The [RequestState](RequestState.md) for [request](#request).

##### Returns

[`RequestState`](RequestState.md)<`RT`, [`StructuredErrorDocument`](../../types/request/types/StructuredErrorDocument.md)<`E`>>

***

### request

#### Get Signature

```ts
get request(): Future<RT>;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:779](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/signals/request-subscription.ts#L779)

The [Future](../../request/types/Future.md) this subscription is currently monitoring, and
(re-)subscribes to notifications for as a side effect of access.

##### Returns

[`Future`](../../request/types/Future.md)<`RT`>

***

### result

#### Get Signature

```ts
get result(): RT;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:807](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/signals/request-subscription.ts#L807)

The resolved content of the request, once it has succeeded.

##### Returns

`RT`
