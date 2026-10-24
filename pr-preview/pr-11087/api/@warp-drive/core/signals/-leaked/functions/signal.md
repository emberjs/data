---
url: /pr-preview/pr-11087/api/@warp-drive/core/signals/-leaked/functions/signal.md
---

# &#x20;signal()

```ts
function signal<T extends object, K extends string>(
   target: T, 
   key: K, 
   descriptor?: DecoratorPropertyDescriptor
): void;
```

Defined in: [warp-drive-packages/core/src/signals/reactivity/signal.ts:107](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/reactivity/signal.ts#L107)

Decorator version of creating a signal.

## Type Parameters

### T

`T` *extends* `object`

### K

`K` *extends* `string`

## Parameters

### target

`T`

### key

`K`

### descriptor?

`DecoratorPropertyDescriptor`

## Returns

`void`
