---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11217/api/@warp-drive/legacy/compat/functions/adapterFor.md
description: >-
  Legacy store method that returns the cached adapter for a model type, falling
  back to the `application` adapter.
---

&#x20;

# &#x20;adapterFor()

```ts
function adapterFor(this: Store$1, modelName: string): MinimumAdapterInterface;
function adapterFor(
   this: Store$1, 
   modelName: string, 
   _allowMissing: true
): 
  | MinimumAdapterInterface
  | undefined;
```

## Call Signature

```ts
function adapterFor(this: Store$1, modelName: string): MinimumAdapterInterface;
```

Defined in: [warp-drive-packages/legacy/src/compat.ts:145](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/legacy/src/compat.ts#L145)

Returns an instance of the adapter for a given type. For
example, `adapterFor('person')` will return an instance of
the adapter located at `app/adapters/person.js`

If no `person` adapter is found, this method will look
for an `application` adapter (the default adapter for
your entire application).

### Parameters

#### this

`Store$1`

#### modelName

`string`

### Returns

[`MinimumAdapterInterface`](../types/MinimumAdapterInterface.md)

## Call Signature

```ts
function adapterFor(
   this: Store$1, 
   modelName: string, 
   _allowMissing: true
): 
  | MinimumAdapterInterface
  | undefined;
```

Defined in: [warp-drive-packages/legacy/src/compat.ts:146](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/legacy/src/compat.ts#L146)

Returns an instance of the adapter for a given type. For
example, `adapterFor('person')` will return an instance of
the adapter located at `app/adapters/person.js`

If no `person` adapter is found, this method will look
for an `application` adapter (the default adapter for
your entire application).

### Parameters

#### this

`Store$1`

#### modelName

`string`

#### \_allowMissing

`true`

### Returns

| [`MinimumAdapterInterface`](../types/MinimumAdapterInterface.md)
| `undefined`
