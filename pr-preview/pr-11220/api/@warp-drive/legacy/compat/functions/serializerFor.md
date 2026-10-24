---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11220/api/@warp-drive/legacy/compat/functions/serializerFor.md
description: >-
  Legacy store method that returns the cached serializer for a model type,
  falling back to the `application` serializer, or `null` if neither exists.
---

&#x20;

# &#x20;serializerFor()

```ts
function serializerFor(this: Store$1, modelName: string): 
  | MinimumSerializerInterface
  | null;
```

Defined in: [warp-drive-packages/legacy/src/compat.ts:209](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/legacy/src/compat.ts#L209)

Returns an instance of the serializer for a given type. For
example, `serializerFor('person')` will return an instance of
`App.PersonSerializer`.

If no `App.PersonSerializer` is found, this method will look
for an `App.ApplicationSerializer` (the default serializer for
your entire application).

If a serializer cannot be found on the adapter, it will fall back
to an instance of `JSONSerializer`.

## Parameters

### this

`Store$1`

### modelName

`string`

the record to serialize

## Returns

| [`MinimumSerializerInterface`](../types/MinimumSerializerInterface.md)
| `null`
