---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11237/api/@warp-drive/utilities/types/FindRelatedCollectionUrlOptions.md
description: >-
  Options passed to `buildBaseURL` to build the URL for a record's has-many
  relationship, ending in the field name.
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

Defined in: [index.ts:219](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/utilities/src/index.ts#L219)

[buildBaseURL](../functions/buildBaseURL.md) options for a `findRelatedCollection` request.

## Properties

### fieldPath

```ts
fieldPath: string;
```

Defined in: [index.ts:240](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/utilities/src/index.ts#L240)

The relationship field name, appended to the resource path.

***

### host?

```ts
optional host?: string;
```

Defined in: [index.ts:248](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/utilities/src/index.ts#L248)

Overrides the globally configured host for this call only.

***

### identifier

```ts
identifier: {
  id: string;
  type: string;
};
```

Defined in: [index.ts:227](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/utilities/src/index.ts#L227)

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

Defined in: [index.ts:252](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/utilities/src/index.ts#L252)

Overrides the globally configured namespace for this call only.

***

### op

```ts
op: "findRelatedCollection";
```

Defined in: [index.ts:223](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/utilities/src/index.ts#L223)

The request operation this URL is for.

***

### resourcePath?

```ts
optional resourcePath?: string;
```

Defined in: [index.ts:244](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/utilities/src/index.ts#L244)

The path segment for the resource, defaults to `identifier.type` if not provided.
