---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/core/types/spec/json-api-raw/types/ResourceIdentifier.md
---

# &#x20;ResourceIdentifier

```ts
interface ResourceIdentifier {
  lid: string;
}
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:169](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L169)

A minimal reference to a resource by its [lid](#lid) alone.

This is not part of the {json:api} spec, but is accepted by WarpDrive's
cache as a lightweight alternative to ExistingResourceIdentifierObject
once a resource's identity is already known to the cache.

## Properties

### lid

```ts
lid: string;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:173](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L173)

the local identifier WarpDrive has assigned to the resource
