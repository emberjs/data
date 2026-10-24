---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/legacy/compat/types/AdapterPayload.md
description: >-
  Raw object or array payload a legacy adapter resolves with, before a
  serializer normalizes it into a JSON:API document.
---

&#x20;

# &#x20;AdapterPayload

```ts
type AdapterPayload = 
  | Record<string, unknown>
  | unknown[];
```

Defined in: [warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts:27](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts#L27)

The raw payload shape returned by a legacy adapter's request methods,
prior to being normalized by a [MinimumSerializerInterface](MinimumSerializerInterface.md).
