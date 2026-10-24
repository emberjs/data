---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/legacy/compat/functions/serializeRecord.md
---

&#x20;

# &#x20;serializeRecord()

```ts
function serializeRecord(
   this: Store$1, 
   record: unknown, 
   options?: SerializerOptions
): unknown;
```

Defined in: [warp-drive-packages/legacy/src/compat.ts:328](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/legacy/src/compat.ts#L328)

Serializes a record using the store's legacy network layer, as with
[store.serializeRecord](../types/LegacyStoreCompat.md#serializerecord).

## Parameters

### this

`Store$1`

### record

`unknown`

### options?

[`SerializerOptions`](../types/SerializerOptions.md)

## Returns

`unknown`
