---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/utilities/types/CreateRecordUrlOptions.md
---

# &#x20;CreateRecordUrlOptions

```ts
interface CreateRecordUrlOptions {
  host?: string;
  identifier: { type: string };
  namespace?: string;
  op: "createRecord";
  resourcePath?: string;
}
```

Defined in: [index.ts:288](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L288)

[buildBaseURL](../functions/buildBaseURL.md) options for a `createRecord` request.

## Properties

### host?

```ts
optional host?: string;
```

Defined in: [index.ts:309](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L309)

Overrides the globally configured host for this call only.

***

### identifier

```ts
identifier: {
  type: string;
};
```

Defined in: [index.ts:296](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L296)

The type of the record being created.

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

Defined in: [index.ts:313](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L313)

Overrides the globally configured namespace for this call only.

***

### op

```ts
op: "createRecord";
```

Defined in: [index.ts:292](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L292)

The request operation this URL is for.

***

### resourcePath?

```ts
optional resourcePath?: string;
```

Defined in: [index.ts:305](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L305)

The path segment for the resource, defaults to `identifier.type` if not provided.
