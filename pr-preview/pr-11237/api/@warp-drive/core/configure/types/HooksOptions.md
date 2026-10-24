---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11237/api/@warp-drive/core/configure/types/HooksOptions.md
description: >-
  The options passed to the `setupSignals` callback, including the well-known
  key WarpDrive uses for an array's contents signal.
---

# &#x20;HooksOptions

```ts
interface HooksOptions {
  wellknown: { Array: string | symbol };
}
```

Defined in: [warp-drive-packages/core/src/signals/reactivity/configure.ts:137](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/signals/reactivity/configure.ts#L137)

Contains information a [SignalHooks](SignalHooks.md) implementation may want
to use, such as the specialized key used for the signal
representing an array's contents / length.

```ts
interface HooksOptions {
  wellknown: {
    Array: symbol | string;
  }
}
```

## Properties

### wellknown

```ts
wellknown: {
  Array: string | symbol;
};
```

Defined in: [warp-drive-packages/core/src/signals/reactivity/configure.ts:143](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/signals/reactivity/configure.ts#L143)

A list of specialized symbols/strings
used by WarpDrive to encapsulate key
reactivity concerns.

#### Array

```ts
Array: string | symbol;
```

The key used when the signal provides reactivity for the
`length` or "contents" of an array.

Arrays only use a single signal for all accesses, regardless
of index, property or method: this one.
