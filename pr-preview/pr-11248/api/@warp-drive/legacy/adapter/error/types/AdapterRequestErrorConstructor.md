---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/legacy/adapter/error/types/AdapterRequestErrorConstructor.md
description: >-
  Static side of the legacy adapter error constructors: `new (errors?,
  message?)` plus `extend({ message })` for creating further error subclasses.
---

&#x20;

# &#x20;AdapterRequestErrorConstructor\<Instance *extends* [`AdapterRequestError`](AdapterRequestError.md) = [`AdapterRequestError`](AdapterRequestError.md)>

```ts
interface AdapterRequestErrorConstructor<Instance extends AdapterRequestError = AdapterRequestError> {
  constructor: unknown;
  extend(options: { message: string }): AdapterRequestErrorConstructor;
}
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:70](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/legacy/src/adapter/error.ts#L70)

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

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:71](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/legacy/src/adapter/error.ts#L71)

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

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:75](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/legacy/src/adapter/error.ts#L75)

Creates a new AdapterRequestErrorConstructor that inherits from this one.

#### Parameters

##### options

###### message

`string`

#### Returns

`AdapterRequestErrorConstructor`
