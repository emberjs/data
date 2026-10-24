---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11237/api/@warp-drive/core/types/spec/json-api-raw/types/ResourceIdentifier.md
description: >-
  A reference to a resource by its WarpDrive-assigned `lid` alone, accepted by
  the cache once the resource's identity is known.
---

# &#x20;ResourceIdentifier

```ts
interface ResourceIdentifier {
  lid: string;
}
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:191](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L191)

A minimal reference to a resource by its [lid](#lid) alone.

This is not part of the {json:api} spec, but is accepted by WarpDrive's
cache as a lightweight alternative to ExistingResourceIdentifierObject
once a resource's identity is already known to the cache.

## Properties

### lid

```ts
lid: string;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:195](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L195)

the local identifier WarpDrive has assigned to the resource
