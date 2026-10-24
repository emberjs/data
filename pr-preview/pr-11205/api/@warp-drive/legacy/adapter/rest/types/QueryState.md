---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/legacy/adapter/rest/types/QueryState.md
---

&#x20;

# &#x20;QueryState

```ts
type QueryState = {
  include?: unknown;
  since?: unknown;
};
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:50](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/adapter/rest.ts#L50)

The query params built by [buildQuery](../classes/RESTAdapter.md#buildquery) for a
`findAll`/`findRecord` request.

## Properties

### include?

```ts
optional include?: unknown;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:54](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/adapter/rest.ts#L54)

the relationship paths to sideload

***

### since?

```ts
optional since?: unknown;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:58](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/adapter/rest.ts#L58)

a value used to request only records updated since the given value
