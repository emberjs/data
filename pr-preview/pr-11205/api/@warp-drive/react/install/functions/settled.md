---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/react/install/functions/settled.md
---

# &#x20;settled()

```ts
function settled(): Promise<void>;
```

Defined in: [install.ts:50](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/react/src/install.ts#L50)

Resolves once all pending requests started via WarpDrive's React signal
integration have settled. Only tracks requests while `TESTING` is enabled;
a no-op otherwise.

## Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>
