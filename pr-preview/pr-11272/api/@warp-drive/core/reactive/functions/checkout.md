---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/reactive/functions/checkout.md
---

# &#x20;checkout()

```ts
function checkout<T>(resource: unknown): Promise<T & ReactiveResource>;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/record.ts:758](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/reactive/-private/record.ts#L758)

Checkout an immutable resource for editing.

[ReactiveResources](../types/ReactiveResource.md) are not editable by default. This method
creates an editable copy of the resource.

This returns a promise which resolves with the editable
version of the resource.

```ts
import { checkout } from '@warp-drive/core/reactive';

const immutable = store.peekRecord('user', '1');
const editable = await checkout(immutable);
```

Edits to editable resources will be automatically committed if a new
payload from the cache matches their existing value.

## Type Parameters

### T

`T`

## Parameters

### resource

`unknown`

## Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`T` & [`ReactiveResource`](../types/ReactiveResource.md)>

a promise that resolves to the editable resource

## Throws

if the resource is already editable or if resource is an embedded object
