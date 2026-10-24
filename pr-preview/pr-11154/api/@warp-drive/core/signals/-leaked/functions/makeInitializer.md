---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/signals/-leaked/functions/makeInitializer.md
---

# &#x20;makeInitializer()

```ts
function makeInitializer(fn: () => unknown): Initializer;
```

Defined in: [warp-drive-packages/core/src/signals/reactivity/internal.ts:27](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/reactivity/internal.ts#L27)

Wraps `fn` so that a signal can recognize it as a lazy initializer
for its value rather than the value itself, deferring the call to
`fn` until the signal is first accessed.

## Parameters

### fn

() => `unknown`

## Returns

`Initializer`
