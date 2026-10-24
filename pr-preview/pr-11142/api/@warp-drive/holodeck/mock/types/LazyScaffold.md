---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11142/api/@warp-drive/holodeck/mock/types/LazyScaffold.md
description: >-
  Mock whose method and url are known up front and whose full scaffold is built
  only when recording, as passed by the Holodeck mock helpers to `mock`.
---

# &#x20;LazyScaffold

```ts
interface LazyScaffold {
  method: string;
  scaffold: () => Scaffold;
  url: string;
}
```

Defined in: [mock.ts:40](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/packages/holodeck/src/mock.ts#L40)

A mock whose method and url are known up front, with the rest of the
scaffold built only when holodeck is recording. This is what the mock
helpers pass, so that in replay mode a test's response generators never
run.

## Properties

### method

```ts
method: string;
```

Defined in: [mock.ts:41](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/packages/holodeck/src/mock.ts#L41)

***

### scaffold

```ts
scaffold: () => Scaffold;
```

Defined in: [mock.ts:43](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/packages/holodeck/src/mock.ts#L43)

#### Returns

[`Scaffold`](Scaffold.md)

***

### url

```ts
url: string;
```

Defined in: [mock.ts:42](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/packages/holodeck/src/mock.ts#L42)
