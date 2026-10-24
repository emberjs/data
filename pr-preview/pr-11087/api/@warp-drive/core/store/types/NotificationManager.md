---
url: /pr-preview/pr-11087/api/@warp-drive/core/store/types/NotificationManager.md
---

# &#x20;NotificationManager

```ts
interface NotificationManager {
  subscribe(cacheKey: ResourceKey, callback: NotificationCallback, channel?: NotificationChannel): object;
  subscribe(cacheKey: "resource", callback: ResourceOperationCallback): object;
  subscribe(cacheKey: "document" | RequestKey, callback: DocumentOperationCallback): object;
  unsubscribe(token: object): void;
}
```

Defined in: [warp-drive-packages/core/src/store/-private/managers/notification-manager.ts:279](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/store/-private/managers/notification-manager.ts#L279)

**`Hideconstructor`**

The NotificationManager provides the ability to subscribe to
changes to Cache state.

This Feature is what allows WarpDrive to create subscriptions that
work with any framework or change-notification system.

## Methods

### subscribe()

```ts
subscribe(
   cacheKey: ResourceKey, 
   callback: NotificationCallback, 
   channel?: NotificationChannel
): object;
subscribe(cacheKey: "resource", callback: ResourceOperationCallback): object;
subscribe(cacheKey: "document" | RequestKey, callback: DocumentOperationCallback): object;
```

#### Call Signature

```ts
subscribe(
   cacheKey: ResourceKey, 
   callback: NotificationCallback, 
   channel?: NotificationChannel
): object;
```

Defined in: [warp-drive-packages/core/src/store/-private/managers/notification-manager.ts:345](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/store/-private/managers/notification-manager.ts#L345)

Subscribe to changes for a given ResourceKey, RequestKey, or addition/removal of any resource
or document.

```ts
export type CacheOperation = 'added' | 'removed' | 'updated' | 'state';

export interface NotificationCallback {
  (cacheKey: ResourceKey, notificationType: 'attributes' | 'relationships', key?: string): void;
  (cacheKey: ResourceKey, notificationType: 'errors' | 'meta' | 'identity' | 'state'): void;
  (cacheKey: ResourceKey, notificationType: NotificationType, key?: string): void;
}
export interface ResourceOperationCallback {
  // resource updates
  (cacheKey: ResourceKey, notificationType: CacheOperation): void;
}
export interface DocumentOperationCallback {
  // document updates
  (cacheKey: RequestKey, notificationType: CacheOperation): void;
}
```

A `channel` may be provided when subscribing to a `ResourceKey`. Its
effect is that the subscription skips `'attributes'`/`'relationships'`
notifications explicitly tagged with the *other* channel; unscoped
notifications, and notifications for all other notification types, always
reach the subscriber. Subscribing `'local'` and omitting the channel are
the same thing. See [NotificationChannel](../../types/NotificationChannel.md).

| notify ↓ subscribe → | `'local'` | `'remote'` | omitted (= `'local'`) |
| -------------------- | --------- | ---------- | --------------------- |
| `'local'`            | ✅        | ❌         | ✅                    |
| `'remote'`           | ❌        | ✅         | ❌                    |
| omitted              | ✅        | ✅         | ✅                    |

##### Parameters

###### cacheKey

[`ResourceKey`](../../types/identifier/types/ResourceKey.md)

###### callback

`NotificationCallback`

###### channel?

[`NotificationChannel`](../../types/NotificationChannel.md)

##### Returns

`object`

an opaque token to be used with unsubscribe

#### Call Signature

```ts
subscribe(cacheKey: "resource", callback: ResourceOperationCallback): object;
```

Defined in: [warp-drive-packages/core/src/store/-private/managers/notification-manager.ts:346](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/store/-private/managers/notification-manager.ts#L346)

Subscribe to changes for a given ResourceKey, RequestKey, or addition/removal of any resource
or document.

```ts
export type CacheOperation = 'added' | 'removed' | 'updated' | 'state';

export interface NotificationCallback {
  (cacheKey: ResourceKey, notificationType: 'attributes' | 'relationships', key?: string): void;
  (cacheKey: ResourceKey, notificationType: 'errors' | 'meta' | 'identity' | 'state'): void;
  (cacheKey: ResourceKey, notificationType: NotificationType, key?: string): void;
}
export interface ResourceOperationCallback {
  // resource updates
  (cacheKey: ResourceKey, notificationType: CacheOperation): void;
}
export interface DocumentOperationCallback {
  // document updates
  (cacheKey: RequestKey, notificationType: CacheOperation): void;
}
```

A `channel` may be provided when subscribing to a `ResourceKey`. Its
effect is that the subscription skips `'attributes'`/`'relationships'`
notifications explicitly tagged with the *other* channel; unscoped
notifications, and notifications for all other notification types, always
reach the subscriber. Subscribing `'local'` and omitting the channel are
the same thing. See [NotificationChannel](../../types/NotificationChannel.md).

| notify ↓ subscribe → | `'local'` | `'remote'` | omitted (= `'local'`) |
| -------------------- | --------- | ---------- | --------------------- |
| `'local'`            | ✅        | ❌         | ✅                    |
| `'remote'`           | ❌        | ✅         | ❌                    |
| omitted              | ✅        | ✅         | ✅                    |

##### Parameters

###### cacheKey

`"resource"`

###### callback

`ResourceOperationCallback`

##### Returns

`object`

an opaque token to be used with unsubscribe

#### Call Signature

```ts
subscribe(cacheKey: "document" | RequestKey, callback: DocumentOperationCallback): object;
```

Defined in: [warp-drive-packages/core/src/store/-private/managers/notification-manager.ts:347](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/store/-private/managers/notification-manager.ts#L347)

Subscribe to changes for a given ResourceKey, RequestKey, or addition/removal of any resource
or document.

```ts
export type CacheOperation = 'added' | 'removed' | 'updated' | 'state';

export interface NotificationCallback {
  (cacheKey: ResourceKey, notificationType: 'attributes' | 'relationships', key?: string): void;
  (cacheKey: ResourceKey, notificationType: 'errors' | 'meta' | 'identity' | 'state'): void;
  (cacheKey: ResourceKey, notificationType: NotificationType, key?: string): void;
}
export interface ResourceOperationCallback {
  // resource updates
  (cacheKey: ResourceKey, notificationType: CacheOperation): void;
}
export interface DocumentOperationCallback {
  // document updates
  (cacheKey: RequestKey, notificationType: CacheOperation): void;
}
```

A `channel` may be provided when subscribing to a `ResourceKey`. Its
effect is that the subscription skips `'attributes'`/`'relationships'`
notifications explicitly tagged with the *other* channel; unscoped
notifications, and notifications for all other notification types, always
reach the subscriber. Subscribing `'local'` and omitting the channel are
the same thing. See [NotificationChannel](../../types/NotificationChannel.md).

| notify ↓ subscribe → | `'local'` | `'remote'` | omitted (= `'local'`) |
| -------------------- | --------- | ---------- | --------------------- |
| `'local'`            | ✅        | ❌         | ✅                    |
| `'remote'`           | ❌        | ✅         | ❌                    |
| omitted              | ✅        | ✅         | ✅                    |

##### Parameters

###### cacheKey

`"document"` | [`RequestKey`](../../types/identifier/types/RequestKey.md)

###### callback

`DocumentOperationCallback`

##### Returns

`object`

an opaque token to be used with unsubscribe

***

### unsubscribe()

```ts
unsubscribe(token: object): void;
```

Defined in: [warp-drive-packages/core/src/store/-private/managers/notification-manager.ts:382](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/store/-private/managers/notification-manager.ts#L382)

remove a previous subscription

#### Parameters

##### token

`object`

#### Returns

`void`
