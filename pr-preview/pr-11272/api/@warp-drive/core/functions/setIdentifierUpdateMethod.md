---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/functions/setIdentifierUpdateMethod.md
---

# &#x20;setIdentifierUpdateMethod()

```ts
function setIdentifierUpdateMethod(method: UpdateMethod | null): void;
```

Defined in: [warp-drive-packages/core/src/store/-private/managers/cache-key-manager.ts:297](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/store/-private/managers/cache-key-manager.ts#L297)

Configure a callback for when the identifier cache encounters new resource
data for an existing resource.

This configuration MUST occur prior to the store instance being created.

```js
import { setIdentifierUpdateMethod } from '@warp-drive/core';
```

Takes a method which can expect to receive an existing `Identifier` alongside
some new data to consider as a second argument. This is an opportunity
for secondary lookup tables and caches associated with the identifier
to be amended.

This method is called everytime `updateRecordIdentifier` is called and
with the same arguments. It provides the opportunity to update secondary
lookup tables for existing identifiers.

It will always be called after an identifier created with `createIdentifierForNewRecord`
has been committed, or after an update to the `record` a `RecordIdentifier`
is assigned to has been committed. Committed here meaning that the server
has acknowledged the update (for instance after a call to `.save()`)

If `id` has not previously existed, it will be assigned to the `Identifier`
prior to this `UpdateMethod` being called; however, calls to the parent method
`updateRecordIdentifier` that attempt to change the `id` or calling update
without providing an `id` when one is missing will throw an error.

## Parameters

### method

`UpdateMethod` | `null`

## Returns

`void`
