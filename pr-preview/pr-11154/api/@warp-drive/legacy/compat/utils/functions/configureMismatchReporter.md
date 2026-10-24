---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/legacy/compat/utils/functions/configureMismatchReporter.md
---

&#x20;

# &#x20;configureMismatchReporter()

```ts
function configureMismatchReporter(fn: Reporter): void;
```

Defined in: [warp-drive-packages/legacy/src/compat/utils.ts:41](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/compat/utils.ts#L41)

Configure a function to be called when an id or type
changes during normalization. This is useful for instrumenting
to discover places where usage in the app is not consistent.

## Parameters

### fn

`Reporter`

a function which takes a mismatch-type ('formatted-id' | 'formatted-type'), actual, and expected value

## Returns

`void`
