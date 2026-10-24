---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/utilities/types/FindManyUrlOptions.md
---

# &#x20;FindManyUrlOptions

```ts
interface FindManyUrlOptions {
  host?: string;
  identifiers: {
  id: string;
  type: string;
}[];
  namespace?: string;
  op: "findMany";
  resourcePath?: string;
}
```

Defined in: [index.ts:170](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/utilities/src/index.ts#L170)

[buildBaseURL](../functions/buildBaseURL.md) options for a `findMany` request.

## Properties

### host?

```ts
optional host?: string;
```

Defined in: [index.ts:195](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/utilities/src/index.ts#L195)

Overrides the globally configured host for this call only.

***

### identifiers

```ts
identifiers: {
  id: string;
  type: string;
}[];
```

Defined in: [index.ts:178](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/utilities/src/index.ts#L178)

The type and id of each record to find.

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

Defined in: [index.ts:199](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/utilities/src/index.ts#L199)

Overrides the globally configured namespace for this call only.

***

### op

```ts
op: "findMany";
```

Defined in: [index.ts:174](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/utilities/src/index.ts#L174)

The request operation this URL is for.

***

### resourcePath?

```ts
optional resourcePath?: string;
```

Defined in: [index.ts:191](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/utilities/src/index.ts#L191)

The path segment for the resource, defaults to the first identifier's `type` if not provided.
