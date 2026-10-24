---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/legacy/compat/functions/serializeRecord.md
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

Defined in: [warp-drive-packages/legacy/src/compat.ts:328](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/compat.ts#L328)

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
