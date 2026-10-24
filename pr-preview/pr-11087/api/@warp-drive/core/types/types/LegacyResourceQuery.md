---
url: /pr-preview/pr-11087/api/@warp-drive/core/types/types/LegacyResourceQuery.md
---

# &#x20;LegacyResourceQuery

```ts
type LegacyResourceQuery = {
  [key: string]: Value | undefined;
  include?: string | string[];
};
```

Defined in: [warp-drive-packages/core/src/store/-types/q/store.ts:81](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/store/-types/q/store.ts#L81)

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

Defined in: [warp-drive-packages/core/src/store/-types/q/store.ts:87](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/store/-types/q/store.ts#L87)

The names of relationships to load along with this query, used to
build the `include` query parameter for adapters (such as the
JSON:API adapter) that support it.
