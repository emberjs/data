---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11361/api/@warp-drive/core/types/types/LegacyResourceQuery.md
description: >-
  Legacy query object for `store.query` and `store.queryRecord` that the adapter
  turns into request query params, with an optional `include`.
---

# &#x20;LegacyResourceQuery

```ts
type LegacyResourceQuery = {
  [key: string]: Value | undefined;
  include?: string | string[];
};
```

Defined in: [warp-drive-packages/core/src/store/-types/q/store.ts:95](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/store/-types/q/store.ts#L95)

An opaque query object for `store.query()` and `store.queryRecord()`
that is passed as-is to the adapter, which is responsible for turning
it into request query parameters.

## Indexable

```ts
[key: string]: Value | undefined
```

## Properties

### include?

```ts
optional include?: string | string[];
```

Defined in: [warp-drive-packages/core/src/store/-types/q/store.ts:101](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/store/-types/q/store.ts#L101)

The names of relationships to load along with this query, used to
build the `include` query parameter for adapters (such as the
JSON:API adapter) that support it.
