---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/legacy/adapter/error/types/AdapterRequestErrorConstructor.md
---

&#x20;

# &#x20;AdapterRequestErrorConstructor\<Instance *extends* [`AdapterRequestError`](AdapterRequestError.md) = [`AdapterRequestError`](AdapterRequestError.md)>

```ts
interface AdapterRequestErrorConstructor<Instance extends AdapterRequestError = AdapterRequestError> {
  constructor: unknown;
  extend(options: { message: string }): AdapterRequestErrorConstructor;
}
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:58](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/adapter/error.ts#L58)

The static interface shared by [AdapterError](../variables/AdapterError.md) and its subclasses,
allowing further subclassing via [extend](#extend).

## Type Parameters

### Instance

`Instance` *extends* [`AdapterRequestError`](AdapterRequestError.md) = [`AdapterRequestError`](AdapterRequestError.md)

## Constructors

### Constructor

```ts
new AdapterRequestErrorConstructor(errors?: unknown[], message?: string): Instance;
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:59](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/adapter/error.ts#L59)

#### Parameters

##### errors?

`unknown`\[]

##### message?

`string`

#### Returns

`Instance`

## Methods

### extend()

```ts
extend(options: {
  message: string;
}): AdapterRequestErrorConstructor;
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:63](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/adapter/error.ts#L63)

Creates a new AdapterRequestErrorConstructor that inherits from this one.

#### Parameters

##### options

###### message

`string`

#### Returns

`AdapterRequestErrorConstructor`
