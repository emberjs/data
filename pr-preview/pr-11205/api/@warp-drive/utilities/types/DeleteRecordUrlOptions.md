---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/utilities/types/DeleteRecordUrlOptions.md
---

# &#x20;DeleteRecordUrlOptions

```ts
interface DeleteRecordUrlOptions {
  host?: string;
  identifier: { id: string; type: string };
  namespace?: string;
  op: "deleteRecord";
  resourcePath?: string;
}
```

Defined in: [index.ts:358](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L358)

[buildBaseURL](../functions/buildBaseURL.md) options for a `deleteRecord` request.

## Properties

### host?

```ts
optional host?: string;
```

Defined in: [index.ts:383](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L383)

Overrides the globally configured host for this call only.

***

### identifier

```ts
identifier: {
  id: string;
  type: string;
};
```

Defined in: [index.ts:366](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L366)

The type and id of the record being deleted.

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

Defined in: [index.ts:387](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L387)

Overrides the globally configured namespace for this call only.

***

### op

```ts
op: "deleteRecord";
```

Defined in: [index.ts:362](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L362)

The request operation this URL is for.

***

### resourcePath?

```ts
optional resourcePath?: string;
```

Defined in: [index.ts:379](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L379)

The path segment for the resource, defaults to `identifier.type` if not provided.
