---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/utilities/types/QueryUrlOptions.md
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

Defined in: [index.ts:137](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L137)

[buildBaseURL](../functions/buildBaseURL.md) options for a `query` request.

## Properties

### host?

```ts
optional host?: string;
```

Defined in: [index.ts:158](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L158)

Overrides the globally configured host for this call only.

***

### identifier

```ts
identifier: {
  type: string;
};
```

Defined in: [index.ts:145](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L145)

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

Defined in: [index.ts:162](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L162)

Overrides the globally configured namespace for this call only.

***

### op

```ts
op: "query";
```

Defined in: [index.ts:141](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L141)

The request operation this URL is for.

***

### resourcePath?

```ts
optional resourcePath?: string;
```

Defined in: [index.ts:154](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L154)

The path segment for the resource, defaults to `identifier.type` if not provided.
