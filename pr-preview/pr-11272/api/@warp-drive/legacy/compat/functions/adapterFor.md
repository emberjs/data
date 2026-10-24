---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/legacy/compat/functions/adapterFor.md
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

Defined in: [warp-drive-packages/legacy/src/compat.ts:99](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/compat.ts#L99)

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

Defined in: [warp-drive-packages/legacy/src/compat.ts:100](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/compat.ts#L100)

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
