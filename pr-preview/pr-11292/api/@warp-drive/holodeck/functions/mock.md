---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/holodeck/functions/mock.md
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

Defined in: [index.ts:452](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/packages/holodeck/src/index.ts#L452)

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
