---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/utilities/types/FindRelatedCollectionUrlOptions.md
---

# &#x20;FindRelatedCollectionUrlOptions

```ts
interface FindRelatedCollectionUrlOptions {
  fieldPath: string;
  host?: string;
  identifier: { id: string; type: string };
  namespace?: string;
  op: "findRelatedCollection";
  resourcePath?: string;
}
```

Defined in: [index.ts:206](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L206)

[buildBaseURL](../functions/buildBaseURL.md) options for a `findRelatedCollection` request.

## Properties

### fieldPath

```ts
fieldPath: string;
```

Defined in: [index.ts:227](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L227)

The relationship field name, appended to the resource path.

***

### host?

```ts
optional host?: string;
```

Defined in: [index.ts:235](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L235)

Overrides the globally configured host for this call only.

***

### identifier

```ts
identifier: {
  id: string;
  type: string;
};
```

Defined in: [index.ts:214](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L214)

The type and id of the record whose relationship is being fetched.

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

Defined in: [index.ts:239](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L239)

Overrides the globally configured namespace for this call only.

***

### op

```ts
op: "findRelatedCollection";
```

Defined in: [index.ts:210](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L210)

The request operation this URL is for.

***

### resourcePath?

```ts
optional resourcePath?: string;
```

Defined in: [index.ts:231](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L231)

The path segment for the resource, defaults to `identifier.type` if not provided.
