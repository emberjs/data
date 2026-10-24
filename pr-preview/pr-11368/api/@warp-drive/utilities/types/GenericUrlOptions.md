---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/utilities/types/GenericUrlOptions.md
description: >-
  Options passed to `buildBaseURL` to build a URL from an explicit
  `resourcePath` with no request `op`.
---

# &#x20;GenericUrlOptions

```ts
interface GenericUrlOptions {
  host?: string;
  namespace?: string;
  resourcePath: string;
}
```

Defined in: [index.ts:415](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/utilities/src/index.ts#L415)

[buildBaseURL](../functions/buildBaseURL.md) options for building a URL directly from a `resourcePath`
without an associated request operation.

## Properties

### host?

```ts
optional host?: string;
```

Defined in: [index.ts:423](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/utilities/src/index.ts#L423)

Overrides the globally configured host for this call only.

***

### namespace?

```ts
optional namespace?: string;
```

Defined in: [index.ts:427](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/utilities/src/index.ts#L427)

Overrides the globally configured namespace for this call only.

***

### resourcePath

```ts
resourcePath: string;
```

Defined in: [index.ts:419](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/utilities/src/index.ts#L419)

The path segment for the resource.
