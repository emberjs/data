---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11402/api/@warp-drive/legacy/compat/functions/normalize.md
description: >-
  Legacy store method that converts a raw payload into the normalized document
  `store.push` expects, using the serializer for the given model type.
---

&#x20;

# &#x20;normalize()

```ts
function normalize(
   this: Store$1, 
   modelName: string, 
   payload: ObjectValue
): SingleResourceDocument;
```

Defined in: [warp-drive-packages/legacy/src/compat.ts:278](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/legacy/src/compat.ts#L278)

**`Legacy`**

`normalize` converts a json payload into the normalized form expected by
Store.push | push using the serializer specified by `modelName`

:::warning
Generally it would be better to invoke the serializer yourself directly,
or write a more specialized normalization utility.
:::

Example

```js
socket.on('message', function(message) {
  let modelName = message.model;
  let data = message.data;
  store.push(store.normalize(modelName, data));
});
```

## Parameters

### this

`Store$1`

### modelName

`string`

The name of the model type for this payload

### payload

[`ObjectValue`](../../../core/types/json/raw/types/ObjectValue.md)

## Returns

[`SingleResourceDocument`](../../../core/types/spec/json-api-raw/types/SingleResourceDocument.md)

The normalized payload
