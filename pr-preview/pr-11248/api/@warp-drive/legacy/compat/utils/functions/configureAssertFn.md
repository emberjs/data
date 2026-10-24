---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/legacy/compat/utils/functions/configureAssertFn.md
description: >-
  Legacy migration helper that registers a callback invoked when an id or type
  passed to these utilities fails validation.
---

&#x20;

# &#x20;configureAssertFn()

```ts
function configureAssertFn(fn: (message: string, condition: unknown) => void): void;
```

Defined in: [warp-drive-packages/legacy/src/compat/utils.ts:59](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/legacy/src/compat/utils.ts#L59)

Configure a function to be called when an id or type
fails validation. This is useful for instrumenting
to discover places where usage in the app is not consistent.

## Parameters

### fn

(`message`: `string`, `condition`: `unknown`) => `void`

a function which takes a message and a condition

## Returns

`void`
