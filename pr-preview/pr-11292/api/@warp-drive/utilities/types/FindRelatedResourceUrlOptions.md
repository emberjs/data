---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/utilities/types/FindRelatedResourceUrlOptions.md
---

# &#x20;FindRelatedResourceUrlOptions

```ts
interface FindRelatedResourceUrlOptions {
  fieldPath: string;
  host?: string;
  identifier: { id: string; type: string };
  namespace?: string;
  op: "findRelatedRecord";
  resourcePath?: string;
}
```

Defined in: [index.ts:247](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/utilities/src/index.ts#L247)

[buildBaseURL](../functions/buildBaseURL.md) options for a `findRelatedRecord` request.

## Properties

### fieldPath

```ts
fieldPath: string;
```

Defined in: [index.ts:268](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/utilities/src/index.ts#L268)

The relationship field name, appended to the resource path.

***

### host?

```ts
optional host?: string;
```

Defined in: [index.ts:276](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/utilities/src/index.ts#L276)

Overrides the globally configured host for this call only.

***

### identifier

```ts
identifier: {
  id: string;
  type: string;
};
```

Defined in: [index.ts:255](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/utilities/src/index.ts#L255)

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

Defined in: [index.ts:280](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/utilities/src/index.ts#L280)

Overrides the globally configured namespace for this call only.

***

### op

```ts
op: "findRelatedRecord";
```

Defined in: [index.ts:251](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/utilities/src/index.ts#L251)

The request operation this URL is for.

***

### resourcePath?

```ts
optional resourcePath?: string;
```

Defined in: [index.ts:272](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/utilities/src/index.ts#L272)

The path segment for the resource, defaults to `identifier.type` if not provided.
