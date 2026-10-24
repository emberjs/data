---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/utilities/types/QueryUrlOptions.md
description: >-
  Options passed to `buildBaseURL` to build the URL for querying a collection of
  one resource type.
---

# &#x20;QueryUrlOptions

```ts
interface QueryUrlOptions {
  host?: string;
  identifier: { type: string };
  namespace?: string;
  op: "query";
  resourcePath?: string;
}
```

Defined in: [index.ts:146](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/utilities/src/index.ts#L146)

[buildBaseURL](../functions/buildBaseURL.md) options for a `query` request.

## Properties

### host?

```ts
optional host?: string;
```

Defined in: [index.ts:167](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/utilities/src/index.ts#L167)

Overrides the globally configured host for this call only.

***

### identifier

```ts
identifier: {
  type: string;
};
```

Defined in: [index.ts:154](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/utilities/src/index.ts#L154)

The type of the records to query.

#### type

```ts
type: string;
```

The resource type.

***

### namespace?

```ts
optional namespace?: string;
```

Defined in: [index.ts:171](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/utilities/src/index.ts#L171)

Overrides the globally configured namespace for this call only.

***

### op

```ts
op: "query";
```

Defined in: [index.ts:150](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/utilities/src/index.ts#L150)

The request operation this URL is for.

***

### resourcePath?

```ts
optional resourcePath?: string;
```

Defined in: [index.ts:163](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/utilities/src/index.ts#L163)

The path segment for the resource, defaults to `identifier.type` if not provided.
