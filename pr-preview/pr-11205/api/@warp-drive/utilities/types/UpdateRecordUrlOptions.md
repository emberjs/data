---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/utilities/types/UpdateRecordUrlOptions.md
---

# &#x20;UpdateRecordUrlOptions

```ts
interface UpdateRecordUrlOptions {
  host?: string;
  identifier: { id: string; type: string };
  namespace?: string;
  op: "updateRecord";
  resourcePath?: string;
}
```

Defined in: [index.ts:321](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L321)

[buildBaseURL](../functions/buildBaseURL.md) options for an `updateRecord` request.

## Properties

### host?

```ts
optional host?: string;
```

Defined in: [index.ts:346](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L346)

Overrides the globally configured host for this call only.

***

### identifier

```ts
identifier: {
  id: string;
  type: string;
};
```

Defined in: [index.ts:329](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L329)

The type and id of the record being updated.

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

Defined in: [index.ts:350](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L350)

Overrides the globally configured namespace for this call only.

***

### op

```ts
op: "updateRecord";
```

Defined in: [index.ts:325](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L325)

The request operation this URL is for.

***

### resourcePath?

```ts
optional resourcePath?: string;
```

Defined in: [index.ts:342](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L342)

The path segment for the resource, defaults to `identifier.type` if not provided.
