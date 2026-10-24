---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/api/@warp-drive/holodeck/functions/mock.md
description: >-
  Registers a mock response with the Holodeck server for the current test,
  recording it as a fixture when recording and only counting it when replaying.
---

# &#x20;mock()

```ts
function mock(
   owner: object, 
   generate: 
  | LazyScaffold
  | ScaffoldGenerator, 
   isRecording?: boolean
): Promise<void>;
```

Defined in: [index.ts:467](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/packages/holodeck/src/index.ts#L467)

Mock a request by sending the scaffold to the mock server.

## Parameters

### owner

`object`

### generate

| [`LazyScaffold`](../mock/types/LazyScaffold.md)
| [`ScaffoldGenerator`](../mock/types/ScaffoldGenerator.md)

### isRecording?

`boolean`

## Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>
