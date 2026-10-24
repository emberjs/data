---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/types/types/CacheCapabilitiesManager.md
---

# &#x20;CacheCapabilitiesManager

```ts
type CacheCapabilitiesManager = {
  cacheKeyManager: CacheKeyManager;
  identifierCache: CacheKeyManager;
  schema: SchemaService;
  disconnectRecord: void;
  getSchemaDefinitionService: SchemaService;
  hasRecord: boolean;
  notifyChange: void;
  setRecordId: void;
};
```

Defined in: [warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts:21](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts#L21)

CacheCapabilitiesManager provides encapsulated API access to the minimal
subset of the Store's functionality that Cache implementations
should interact with. It is provided to the Store's `createCache` hook.

Cache implementations should not need more than this API provides.

This class cannot be directly instantiated.

## Methods

### disconnectRecord()

```ts
disconnectRecord(identifier: ResourceKey): void;
```

Defined in: [warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts:78](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts#L78)

Signal to the store that the specified record may be considered fully
removed from the cache. Generally this means that not only does no
data exist for the identified resource, no known relationships still
point to it either.

#### Parameters

##### identifier

[`ResourceKey`](../identifier/types/ResourceKey.md)

#### Returns

`void`

***

### ~~getSchemaDefinitionService()~~&#x20;

```ts
getSchemaDefinitionService(): SchemaService;
```

Defined in: [warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts:48](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts#L48)

DEPRECATED - use the schema property

Provides access to the SchemaService instance
for this Store instance.

The SchemaService can be used to query for
information about the schema of a resource.

#### Returns

[`SchemaService`](../schema/schema-service/types/SchemaService.md)

#### Deprecated

use [CacheCapabilitiesManager.schema](#schema)

***

### hasRecord()

```ts
hasRecord(identifier: ResourceKey): boolean;
```

Defined in: [warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts:86](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts#L86)

Use this method to determine if the Store has an instantiated record associated
with an identifier.

#### Parameters

##### identifier

[`ResourceKey`](../identifier/types/ResourceKey.md)

#### Returns

`boolean`

***

### notifyChange()

```ts
notifyChange(
   identifier: ResourceKey, 
   namespace: "added" | "removed", 
   key: null
): void;
notifyChange(
   identifier: RequestKey, 
   namespace: "added" | "removed" | "updated", 
   key: null
): void;
notifyChange(
   identifier: ResourceKey, 
   namespace: "attributes", 
   key: string | NotifyKeys | null, 
   channel?: NotificationChannel
): void;
notifyChange(
   identifier: ResourceKey, 
   namespace: NotificationType, 
   key: string | null, 
   channel?: NotificationChannel
): void;
notifyChange(
   identifier: 
  | RequestKey
  | ResourceKey, 
   namespace: NotificationType, 
   key: string | NotifyKeys | null, 
   channel?: NotificationChannel
): void;
```

#### Call Signature

```ts
notifyChange(
   identifier: ResourceKey, 
   namespace: "added" | "removed", 
   key: null
): void;
```

Defined in: [warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts:96](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts#L96)

Notify subscribers of the NotificationManager that cache state has changed.

This overload notifies that a resource has been added to or removed from
the cache. `key` is always `null` for these namespaces.

##### Parameters

###### identifier

[`ResourceKey`](../identifier/types/ResourceKey.md)

###### namespace

`"added"` | `"removed"`

###### key

`null`

##### Returns

`void`

#### Call Signature

```ts
notifyChange(
   identifier: RequestKey, 
   namespace: "added" | "removed" | "updated", 
   key: null
): void;
```

Defined in: [warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts:104](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts#L104)

Notify subscribers that a request (as identified by a [RequestKey](../identifier/types/RequestKey.md))
has been added, updated, or removed from the cache. `key` is always
`null` for these namespaces.

##### Parameters

###### identifier

[`RequestKey`](../identifier/types/RequestKey.md)

###### namespace

`"added"` | `"removed"` | `"updated"`

###### key

`null`

##### Returns

`void`

#### Call Signature

```ts
notifyChange(
   identifier: ResourceKey, 
   namespace: "attributes", 
   key: string | NotifyKeys | null, 
   channel?: NotificationChannel
): void;
```

Defined in: [warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts:126](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts#L126)

Notify subscribers that one or more attributes on a resource have
changed. `key` may be a single attribute name, or - since 5.9.0 - a
`Set<string>` of attribute names. This is useful when many attributes on
the same resource have changed at once (for instance after applying a
bulk update): passing the full `Set` of changed keys in a single call is
equivalent to calling `notifyChange` once per key (subscribers still
receive one notification per key, in the same order), but avoids
repeating the per-call bookkeeping (subscriber lookups, buffer
scheduling, etc) for every key. The `Set` is iterated as-is and never
converted to or from an array.

`channel` may additionally be provided: tagging the notification
`'local'` declares "only local state changed", letting `'remote'`-scoped
subscribers skip it; `'remote'` or omitted reaches every subscriber. See
the delivery matrix on the other `notifyChange` overload and
[NotificationChannel](../NotificationChannel.md).

##### Parameters

###### identifier

[`ResourceKey`](../identifier/types/ResourceKey.md)

###### namespace

`"attributes"`

###### key

`string` | [`NotifyKeys`](../NotifyKeys.md) | `null`

###### channel?

[`NotificationChannel`](../NotificationChannel.md)

##### Returns

`void`

#### Call Signature

```ts
notifyChange(
   identifier: ResourceKey, 
   namespace: NotificationType, 
   key: string | null, 
   channel?: NotificationChannel
): void;
```

Defined in: [warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts:153](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts#L153)

Notify subscribers of a change to a resource for any other
[NotificationType](../NotificationType.md). `attributes` and `relationships` do not
require a key, but if one is specified it is assumed to be the name
of the attribute or relationship that has been updated.

`channel` may be provided for the `'attributes'`/`'relationships'`
namespaces. Tagging a notification `'local'` declares "only the local
(reconciled/editable) view changed"; tagging it `'remote'` declares "only
the remote view changed". Each tag is delivered only to that channel's
subscribers. Omitting the channel reaches every subscriber regardless of
its channel. See [NotificationChannel](../NotificationChannel.md).

| notify ↓ subscribe → | `'local'` | `'remote'` | omitted (= `'local'`) |
| -------------------- | --------- | ---------- | --------------------- |
| `'local'`            | ✅        | ❌         | ✅                    |
| `'remote'`           | ❌        | ✅         | ❌                    |
| omitted              | ✅        | ✅         | ✅                    |

##### Parameters

###### identifier

[`ResourceKey`](../identifier/types/ResourceKey.md)

###### namespace

[`NotificationType`](../NotificationType.md)

###### key

`string` | `null`

###### channel?

[`NotificationChannel`](../NotificationChannel.md)

##### Returns

`void`

#### Call Signature

```ts
notifyChange(
   identifier: 
  | RequestKey
  | ResourceKey, 
   namespace: NotificationType, 
   key: string | NotifyKeys | null, 
   channel?: NotificationChannel
): void;
```

Defined in: [warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts:165](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts#L165)

Implementation signature for [CacheCapabilitiesManager.notifyChange](#notifychange)
covering all supported combinations of identifier, namespace, and key.

##### Parameters

###### identifier

| [`RequestKey`](../identifier/types/RequestKey.md)
| [`ResourceKey`](../identifier/types/ResourceKey.md)

###### namespace

[`NotificationType`](../NotificationType.md)

###### key

`string` | [`NotifyKeys`](../NotifyKeys.md) | `null`

###### channel?

[`NotificationChannel`](../NotificationChannel.md)

##### Returns

`void`

***

### setRecordId()

```ts
setRecordId(identifier: ResourceKey, id: string): void;
```

Defined in: [warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts:68](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts#L68)

Update the `id` for the record corresponding to the identifier
This operation can only be done for records whose `id` is `null`.

#### Parameters

##### identifier

[`ResourceKey`](../identifier/types/ResourceKey.md)

##### id

`string`

#### Returns

`void`

## Properties

### cacheKeyManager

```ts
cacheKeyManager: CacheKeyManager;
```

Defined in: [warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts:31](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts#L31)

Provides access to the CacheKeyManager instance
for this Store instance.

The CacheKeyManager can be used to peek, generate or
retrieve a stable unique identifier for any resource.

***

### ~~identifierCache~~&#x20;

```ts
identifierCache: CacheKeyManager;
```

Defined in: [warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts:34](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts#L34)

#### Deprecated

use [CacheCapabilitiesManager.cacheKeyManager](#cachekeymanager)

***

### schema

```ts
schema: SchemaService;
```

Defined in: [warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts:60](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-types/q/cache-capabilities-manager.ts#L60)

Provides access to the SchemaService instance
for this Store instance.

The SchemaService can be used to query for
information about the schema of a resource.
