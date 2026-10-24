---
url: /pr-preview/pr-11154/api/@warp-drive/utilities/types/GenericUrlOptions.md
---

# &#x20;GenericUrlOptions

```ts
interface GenericUrlOptions {
  host?: string;
  namespace?: string;
  resourcePath: string;
}
```

Defined in: [index.ts:396](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/utilities/src/index.ts#L396)

[buildBaseURL](../functions/buildBaseURL.md) options for building a URL directly from a `resourcePath`
without an associated request operation.

## Properties

### host?

```ts
optional host?: string;
```

Defined in: [index.ts:404](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/utilities/src/index.ts#L404)

Overrides the globally configured host for this call only.

***

### namespace?

```ts
optional namespace?: string;
```

Defined in: [index.ts:408](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/utilities/src/index.ts#L408)

Overrides the globally configured namespace for this call only.

***

### resourcePath

```ts
resourcePath: string;
```

Defined in: [index.ts:400](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/utilities/src/index.ts#L400)

The path segment for the resource.
