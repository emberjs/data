---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@warp-drive/core/build-config/canary-features/variables/ENFORCE_STRICT_RESOURCE_FINALIZATION.md
description: >-
  Canary feature flag that throws in development when `schema.fields` is first
  called for a resource whose traits, or its traits' traits, are missing.
---

# &#x20;ENFORCE\_STRICT\_RESOURCE\_FINALIZATION&#x20;

```ts
const ENFORCE_STRICT_RESOURCE_FINALIZATION: boolean | null;
```

Defined in: [warp-drive-packages/build-config/src/canary-features.ts:156](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/build-config/src/canary-features.ts#L156)

This upcoming feature adds a validation step when `schema.fields({ type })`
is called for the first time for a resource.

When active, if any trait specified by the resource or one of its traits is
missing an error will be thrown in development.
