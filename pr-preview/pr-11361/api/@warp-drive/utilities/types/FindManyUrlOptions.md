---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11361/api/@warp-drive/utilities/types/FindManyUrlOptions.md
description: >-
  Options passed to `buildBaseURL` to build the URL for fetching several
  resources, pathed by the first identifier's type.
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

Defined in: [index.ts:181](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/utilities/src/index.ts#L181)

[buildBaseURL](../functions/buildBaseURL.md) options for a `findMany` request.

## Properties

### host?

```ts
optional host?: string;
```

Defined in: [index.ts:206](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/utilities/src/index.ts#L206)

Overrides the globally configured host for this call only.

***

### identifiers

```ts
identifiers: {
  id: string;
  type: string;
}[];
```

Defined in: [index.ts:189](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/utilities/src/index.ts#L189)

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

Defined in: [index.ts:210](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/utilities/src/index.ts#L210)

Overrides the globally configured namespace for this call only.

***

### op

```ts
op: "findMany";
```

Defined in: [index.ts:185](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/utilities/src/index.ts#L185)

The request operation this URL is for.

***

### resourcePath?

```ts
optional resourcePath?: string;
```

Defined in: [index.ts:202](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/utilities/src/index.ts#L202)

The path segment for the resource, defaults to the first identifier's `type` if not provided.
