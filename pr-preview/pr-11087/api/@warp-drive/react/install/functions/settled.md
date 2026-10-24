---
url: /pr-preview/pr-11087/api/@warp-drive/react/install/functions/settled.md
---

# &#x20;settled()

```ts
function settled(): Promise<void>;
```

Defined in: [install.ts:50](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/react/src/install.ts#L50)

Resolves once all pending requests started via WarpDrive's React signal
integration have settled. Only tracks requests while `TESTING` is enabled;
a no-op otherwise.

## Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>
