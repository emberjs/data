---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/build-config/canary-features/variables/ENFORCE_STRICT_RESOURCE_FINALIZATION.md
---

# &#x20;ENFORCE\_STRICT\_RESOURCE\_FINALIZATION&#x20;

```ts
const ENFORCE_STRICT_RESOURCE_FINALIZATION: boolean | null = false;
```

Defined in: [canary-features.ts:150](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/build-config/src/canary-features.ts#L150)

This upcoming feature adds a validation step when `schema.fields({ type })`
is called for the first time for a resource.

When active, if any trait specified by the resource or one of its traits is
missing an error will be thrown in development.
