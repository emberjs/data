---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11220/api/@warp-drive/core/functions/recordIdentifierFor.md
description: >-
  Returns the stable `ResourceKey` (type, id, and lid) the store assigned to a
  record instance.
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

Defined in: [warp-drive-packages/core/src/store/-private/caches/instance-cache.ts:54](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/store/-private/caches/instance-cache.ts#L54)

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

Defined in: [warp-drive-packages/core/src/store/-private/caches/instance-cache.ts:55](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/store/-private/caches/instance-cache.ts#L55)

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
