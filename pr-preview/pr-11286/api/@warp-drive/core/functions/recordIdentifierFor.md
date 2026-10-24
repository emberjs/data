---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/functions/recordIdentifierFor.md
---

# &#x20;recordIdentifierFor()

```ts
function recordIdentifierFor<T extends TypedRecordInstance>(record: T): ResourceKey<TypeFromInstance<T>>;
function recordIdentifierFor(record: unknown): ResourceKey;
```

## Call Signature

```ts
function recordIdentifierFor<T extends TypedRecordInstance>(record: T): ResourceKey<TypeFromInstance<T>>;
```

Defined in: [warp-drive-packages/core/src/store/-private/caches/instance-cache.ts:53](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/caches/instance-cache.ts#L53)

Retrieves the unique referentially-stable [ResourceKey](../types/identifier/types/ResourceKey.md)
assigned to the given record instance.

```js
import { recordIdentifierFor } from "@warp-drive/core";
// ... gain access to a record, for instance with peekRecord or findRecord
const record = store.peekRecord("user", "1");
// get the identifier for the record (see docs for ResourceKey)
const identifier = recordIdentifierFor(record);
// access the identifier's properties.
const { id, type, lid } = identifier;
```

### Type Parameters

#### T

`T` *extends* [`TypedRecordInstance`](../types/record/types/TypedRecordInstance.md)

### Parameters

#### record

`T`

a record instance previously obstained from the store.

### Returns

[`ResourceKey`](../types/identifier/types/ResourceKey.md)<[`TypeFromInstance`](../types/record/types/TypeFromInstance.md)<`T`>>

## Call Signature

```ts
function recordIdentifierFor(record: unknown): ResourceKey;
```

Defined in: [warp-drive-packages/core/src/store/-private/caches/instance-cache.ts:54](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/caches/instance-cache.ts#L54)

Retrieves the unique referentially-stable [ResourceKey](../types/identifier/types/ResourceKey.md)
assigned to the given record instance.

```js
import { recordIdentifierFor } from "@warp-drive/core";
// ... gain access to a record, for instance with peekRecord or findRecord
const record = store.peekRecord("user", "1");
// get the identifier for the record (see docs for ResourceKey)
const identifier = recordIdentifierFor(record);
// access the identifier's properties.
const { id, type, lid } = identifier;
```

### Parameters

#### record

`unknown`

a record instance previously obstained from the store.

### Returns

[`ResourceKey`](../types/identifier/types/ResourceKey.md)
