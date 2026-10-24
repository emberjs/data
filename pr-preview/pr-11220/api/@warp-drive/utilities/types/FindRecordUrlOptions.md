---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11220/api/@warp-drive/utilities/types/FindRecordUrlOptions.md
description: >-
  Options passed to `buildBaseURL` to build the URL for fetching one resource by
  type and id.
---

# &#x20;FindRecordUrlOptions

```ts
interface FindRecordUrlOptions {
  host?: string;
  identifier: { id: string; type: string };
  namespace?: string;
  op: "findRecord";
  resourcePath?: string;
}
```

Defined in: [index.ts:108](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/utilities/src/index.ts#L108)

[buildBaseURL](../functions/buildBaseURL.md) options for a `findRecord` request.

## Properties

### host?

```ts
optional host?: string;
```

Defined in: [index.ts:133](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/utilities/src/index.ts#L133)

Overrides the globally configured host for this call only.

***

### identifier

```ts
identifier: {
  id: string;
  type: string;
};
```

Defined in: [index.ts:116](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/utilities/src/index.ts#L116)

The type and id of the record to find.

#### id

```ts
id: string;
```

The resource id.

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

Defined in: [index.ts:137](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/utilities/src/index.ts#L137)

Overrides the globally configured namespace for this call only.

***

### op

```ts
op: "findRecord";
```

Defined in: [index.ts:112](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/utilities/src/index.ts#L112)

The request operation this URL is for.

***

### resourcePath?

```ts
optional resourcePath?: string;
```

Defined in: [index.ts:129](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/utilities/src/index.ts#L129)

The path segment for the resource, defaults to `identifier.type` if not provided.
